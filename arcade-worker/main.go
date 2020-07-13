package main
import (
	"github.com/mzbac/cloud-arcade/arcade-worker/pkg/room"
	"log"
	"github.com/mzbac/cloud-arcade/arcade-worker/pkg/signal"
	"fmt"
	"github.com/mzbac/cloud-arcade/arcade-worker/pkg/WebRTCClient"
)

func main() {
	webrtcClient := WebRTCClient.NewWebRTC()
	log.Println("=== StartClient ===")
	localSession, _ := webrtcClient.StartClient(
		func(candidate string) {
			fmt.Println("candidate string:");
			fmt.Println(candidate);
		},
	)

	fmt.Println(localSession);

	err := webrtcClient.SetRemoteSDP(signal.MustReadStdin())
	if err != nil {
		panic(err)
	}
	log.Println("=== add candidate ===")
	webrtcClient.AddCandidate(signal.MustReadStdin())
	room :=room.NewRoom()
	room.AddConnectionToRoom(webrtcClient)
	// Block forever
	select {}
}
