package room

import (
	"fmt"
	"log"
	"runtime"
	"sync"

	"github.com/mzbac/cloud-arcade/arcade-worker/pkg/WebRTCClient"
	"github.com/mzbac/cloud-arcade/arcade-worker/pkg/util"
	"gopkg.in/hraban/opus.v2"

	"github.com/mzbac/cloud-arcade/arcade-worker/pkg/config"
	"github.com/mzbac/cloud-arcade/arcade-worker/pkg/emulator"
	"github.com/mzbac/cloud-arcade/arcade-worker/pkg/emulator/libretro/nanoarch"
	"github.com/mzbac/cloud-arcade/arcade-worker/pkg/encoder"
	"github.com/mzbac/cloud-arcade/arcade-worker/pkg/encoder/h264encoder"
	"github.com/mzbac/cloud-arcade/arcade-worker/pkg/util/gamelist"
)

type Room struct {
	ID string

	// imageChannel is image stream received from director
	imageChannel <-chan nanoarch.GameFrame
	// audioChannel is audio stream received from director
	audioChannel <-chan []int16
	// inputChannel is input stream send to director. This inputChannel is combined
	// input from webRTC + connection info (player indexc)
	inputChannel chan<- nanoarch.InputEvent

	rtcSessions []*WebRTCClient.WebRTCClient

	RegisterSessionChannel   chan *WebRTCClient.WebRTCClient
	UnRegisterSessionChannel chan *WebRTCClient.WebRTCClient

	// State of room
	IsRunning bool
	// Done channel is to fire exit event when room is closed
	Done chan struct{}
	// List of peerconnections in the room
	emulator emulator.CloudEmulator
	// GameName
	GameName     string
	sessionsLock *sync.Mutex

	UpdatePlayerCount chan int

	PlayerMap map[int]*WebRTCClient.WebRTCClient
}

func NewRoom() *Room {

	gameInfo := gamelist.GetGameInfo("./assets/games/ssriders.zip")

	inputChannel := make(chan nanoarch.InputEvent, 100)
	sessionChannel := make(chan *WebRTCClient.WebRTCClient)
	unregisterSessionChannel := make(chan *WebRTCClient.WebRTCClient)
	updatePlayerCount := make(chan int, 100)
	playerMap := map[int]*WebRTCClient.WebRTCClient{}

	room := &Room{
		ID:                       "roomID",
		GameName:                 "Sunset riders",
		inputChannel:             inputChannel,
		imageChannel:             nil,
		IsRunning:                true,
		rtcSessions:              []*WebRTCClient.WebRTCClient{},
		Done:                     make(chan struct{}, 1),
		RegisterSessionChannel:   sessionChannel,
		UnRegisterSessionChannel: unregisterSessionChannel,
		sessionsLock:             &sync.Mutex{},
		UpdatePlayerCount:        updatePlayerCount,
		PlayerMap:                playerMap,
	}

	// Check if room is on local storage, if not, pull from GCS to local storage
	go func(game gamelist.GameInfo) {

		emuName, _ := config.FileTypeToEmulator[game.Type]

		director, imageChannel, audioChannel := nanoarch.Init(emuName, room.ID, inputChannel)
		room.imageChannel = imageChannel
		room.emulator = director
		room.audioChannel = audioChannel

		gameMeta := room.emulator.LoadMeta(game.Path)

		// nwidth, nheight are the webRTC output size.
		// There are currently two approach
		var nwidth, nheight int
		nwidth, nheight = gameMeta.BaseWidth, gameMeta.BaseHeight

		encoderW, encoderH := nwidth, nheight
		if gameMeta.Rotation.IsEven {
			encoderW, encoderH = nheight, nwidth
		}

		room.emulator.SetViewport(encoderW, encoderH)

		// Spawn video and audio encoding for webRTC
		go room.startVideo(encoderW, encoderH, config.CODEC_H264)
		go room.startAudio(gameMeta.AudioSampleRate)

		room.emulator.Start()

		// TODO: do we need GC, we can remove it
		runtime.GC()
	}(gameInfo)

	go func() {
		for {
			select {
			case s := <-room.RegisterSessionChannel:
				room.sessionsLock.Lock()
				skip := false
				for _, ss := range room.rtcSessions {
					if ss.ID == s.ID {
						skip = true
						break
					}
				}
				if !skip {
					room.rtcSessions = append(room.rtcSessions, s)
					room.UpdatePlayerCount <- len(room.rtcSessions)
					playerIndex := -1
					for i := 0; i < 8; i++ {
						session, _ := room.PlayerMap[i]
						if session == nil {
							room.PlayerMap[i] = s
							playerIndex = i
							break
						}
					}
					go room.startWebRTCSession(s, playerIndex)
				}

				room.sessionsLock.Unlock()

			case s := <-room.UnRegisterSessionChannel:
				for i := 0; i < 8; i++ {
					session, _ := room.PlayerMap[i]
					if session == s {
						room.PlayerMap[i] = nil
						break
					}
				}
				for i, ss := range room.rtcSessions {
					if ss == s {
						room.sessionsLock.Lock()
						room.rtcSessions = append(room.rtcSessions[:i], room.rtcSessions[i+1:]...)
						room.UpdatePlayerCount <- len(room.rtcSessions)
						room.sessionsLock.Unlock()
						break
					}
				}
			}
		}
	}()
	return room
}

func (r *Room) startVideo(width, height int, videoEncoderType string) {
	var enc encoder.Encoder
	var err error

	log.Println("Video Encoder: ", videoEncoderType)
	if videoEncoderType == config.CODEC_H264 {
		enc, err = h264encoder.NewH264Encoder(width, height, 1)
	}

	defer func() {
		enc.Stop()
	}()

	if err != nil {
		fmt.Println("error create new encoder", err)
		return
	}
	einput := enc.GetInputChan()
	eoutput := enc.GetOutputChan()

	// send screenshot
	go func() {
		defer func() {
			if r := recover(); r != nil {
				fmt.Println("Recovered when sent to close Image Channel")
			}
		}()

		// fanout Screen
		for data := range eoutput {
			// TODO: r.rtcSessions is rarely updated. Lock will hold down perf
			for _, webRTC := range r.rtcSessions {
				// encode frame
				// fanout imageChannel
				if webRTC.IsConnected() {
					// NOTE: can block here
					webRTC.ImageChannel <- WebRTCClient.WebFrame{Data: data.Data, Timestamp: data.Timestamp}
				}
			}
		}
	}()

	for image := range r.imageChannel {
		if len(einput) < cap(einput) {
			einput <- encoder.InFrame{Image: image.Image, Timestamp: image.Timestamp}
		}
	}
	log.Println("Room ", r.ID, " video channel closed")
}

func (r *Room) startAudio(sampleRate int) {
	log.Println("Enter fan audio")
	srcSampleRate := sampleRate

	enc, err := opus.NewEncoder(config.AUDIO_RATE, 2, opus.AppAudio)
	if err != nil {
		log.Println("[!] Cannot create audio encoder", err)
	}

	enc.SetMaxBandwidth(opus.Fullband)
	enc.SetBitrateToAuto()
	enc.SetComplexity(10)

	dstBufferSize := config.AUDIO_FRAME
	srcBufferSize := dstBufferSize * srcSampleRate / config.AUDIO_RATE
	pcm := make([]int16, srcBufferSize) // 640 * 1000 / 16000 == 40 ms
	idx := 0

	// fanout Audio
	for sample := range r.audioChannel {
		for i := 0; i < len(sample); {
			rem := util.MinInt(len(sample)-i, len(pcm)-idx)
			copy(pcm[idx:idx+rem], sample[i:i+rem])
			i += rem
			idx += rem

			if idx == len(pcm) {
				data := make([]byte, 1024*2)
				dstpcm := resample(pcm, dstBufferSize, srcSampleRate, config.AUDIO_RATE)
				n, err := enc.Encode(dstpcm, data)

				if err != nil {
					log.Println("[!] Failed to decode", err)

					idx = 0
					continue
				}
				data = data[:n]

				// TODO: r.rtcSessions is rarely updated. Lock will hold down perf
				//r.sessionsLock.Lock()
				for _, webRTC := range r.rtcSessions {
					if webRTC.IsConnected() {
						// NOTE: can block here
						webRTC.AudioChannel <- data
					}
				}

				idx = 0
			}
		}

	}
	log.Println("Room ", r.ID, " audio channel closed")
}

func (r *Room) startWebRTCSession(peerconnection *WebRTCClient.WebRTCClient, PlayerIdx int) {
	defer func() {
		if r := recover(); r != nil {
			log.Println("Warn: Recovered when sent to close inputChannel")
		}
	}()

	log.Println("Start WebRTC session")
	// bug: when inputchannel here = nil , skip and finish
	for input := range peerconnection.InputChannel {
		// NOTE: when room is no longer running. InputChannel needs to have extra event to go inside the loop
		if peerconnection.Done || !peerconnection.IsConnected() || !r.IsRunning {
			break
		}

		if peerconnection.IsConnected() {
			select {
			case r.inputChannel <- nanoarch.InputEvent{RawState: input, PlayerIdx: PlayerIdx}:
			default:
			}
		}
	}

	log.Println("Peerconn done")
}
