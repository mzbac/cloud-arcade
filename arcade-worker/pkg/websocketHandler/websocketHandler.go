package websocketHandler

import (
	"crypto/tls"
	"encoding/json"
	"log"
	"net/url"
	"strconv"
	"time"

	"github.com/gorilla/websocket"
	"github.com/mzbac/cloud-arcade/arcade-worker/pkg/WebRTCClient"
	"github.com/mzbac/cloud-arcade/arcade-worker/pkg/room"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10
)

type Handler struct {
	signalConn   *websocket.Conn
	sessions     map[string]*WebRTCClient.WebRTCClient
	recvCallback map[string]func(req Message)
	send         chan Message
	room         *room.Room
}
type Message struct {
	ID        string `json:"id"`
	Data      string `json:"data"`
	SessionID string `json:"sessionID"`
}

func NewHandler() *Handler {

	return &Handler{
		sessions:     map[string]*WebRTCClient.WebRTCClient{},
		recvCallback: map[string]func(Message){},
		send:         make(chan Message, 256),
		room:         room.NewRoom(),
	}
}

func (h *Handler) Run() {

	signalServerURL := url.URL{
		Scheme: "ws",
		Host:   "35.189.21.9:8000",
		Path:   "/wws",
	}
	log.Println("Worker connecting to signal:", signalServerURL.String())
	conn, err := createWSConnection(&signalServerURL)
	h.signalConn = conn
	if err != nil {
		panic(err)
	}

	h.route()
	go h.listenRecv(conn)
	go h.listenSend(conn)
	h.send <- Message{
		ID:   "gameInfo",
		Data: h.room.GameName,
	}
	go func() {
		defer close(h.room.UpdatePlayerCount)
		for {
			select {
			case count, ok := <-h.room.UpdatePlayerCount:
				if !ok {
					continue
				}
				h.send <- Message{
					ID:   "updatePlayerCount",
					Data: strconv.Itoa(count),
				}
			}
		}

	}()

	go func() {
		ticker := time.NewTicker(writeWait)

		defer func() {
			ticker.Stop()
		}()
		for {
			select {
			case <-ticker.C:
				for key, element := range h.sessions {
					if element.IsStop() {
						element.StopClient()
						delete(h.sessions, key)
						h.room.UnRegisterSessionChannel <- element
					}
				}

			}
		}
	}()
}

func createWSConnection(ourl *url.URL) (*websocket.Conn, error) {
	var d websocket.Dialer
	if ourl.Scheme == "wss" {
		d = websocket.Dialer{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	} else {
		d = websocket.Dialer{}
	}

	ws, _, err := d.Dial(ourl.String(), nil)
	if err != nil {
		return nil, err
	}

	return ws, nil
}

func (h *Handler) listenRecv(c *websocket.Conn) {
	defer func() {
		c.Close()
	}()
	// c.SetReadLimit(maxMessageSize)
	c.SetReadDeadline(time.Now().Add(pongWait))
	c.SetPongHandler(func(string) error { c.SetReadDeadline(time.Now().Add(pongWait)); return nil })

	for {
		_, message, err := c.ReadMessage()

		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		wspacket := Message{}
		err = json.Unmarshal(message, &wspacket)

		if err != nil {
			log.Println("Warn: error decoding", message)
			continue
		}

		if callback, ok := h.recvCallback[wspacket.ID]; ok {
			go callback(wspacket)
		}
	}
}

func (h *Handler) listenSend(c *websocket.Conn) {
	ticker := time.NewTicker(pingPeriod)

	defer func() {
		ticker.Stop()
		c.Close()
	}()
	for {
		select {
		case message, ok := <-h.send:
			c.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			data, err := json.Marshal(message)
			if err != nil {
				return
			}
			c.WriteMessage(websocket.TextMessage, data)
		case <-ticker.C:
			c.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (h *Handler) route() {
	h.recvCallback["initwebrtc"] = func(req Message) {
		log.Println("received worker initwebrtc")

		webrtcClient := WebRTCClient.NewWebRTC()
		localSession, _ := webrtcClient.StartClient(
			func(candidate string) {
				h.send <- Message{
					ID:        "candidate",
					Data:      candidate,
					SessionID: req.SessionID,
				}
			},
		)

		h.sessions[req.SessionID] = webrtcClient

		h.send <- Message{
			ID:        "offer",
			Data:      localSession,
			SessionID: req.SessionID,
		}
	}

	h.recvCallback["answer"] = func(req Message) {
		log.Println("received answer")
		session, ok := h.sessions[req.SessionID]
		if !ok {
			log.Println("session doesn't exist")
			return
		}
		err := session.SetRemoteSDP(req.Data)
		if err != nil {
			log.Println("Error: Cannot set RemoteSDP of client: " + req.SessionID)
		}
	}

	h.recvCallback["candidate"] = func(req Message) {
		log.Println("received candidate")
		session, ok := h.sessions[req.SessionID]
		if !ok {
			log.Println("session doesn't exist")
			return
		}
		err := session.AddCandidate(req.Data)
		if err != nil {
			log.Println("Error: Cannot set RemoteSDP of client: " + req.SessionID)
		}
	}

	h.recvCallback["joinRoom"] = func(req Message) {
		log.Println("received joinRoom", req.SessionID)
		session, ok := h.sessions[req.SessionID]
		if !ok {
			log.Println("session doesn't exist")
			return
		}

		h.room.RegisterSessionChannel <- session

	}

	h.recvCallback["terminateSession"] = func(req Message) {
		log.Println("received terminateSession", req.SessionID)
		session, ok := h.sessions[req.SessionID]
		if ok {
			session.StopClient()
			delete(h.sessions, req.SessionID)
			h.room.UnRegisterSessionChannel <- session

		}
	}
}
