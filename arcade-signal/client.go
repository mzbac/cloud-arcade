package main

import (
	"time"
	"encoding/json"
	"log"
	"github.com/gofrs/uuid"
	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)


type Client struct {
	id string

	conn *websocket.Conn

	recvCallback map[string]func(req Message)

	send chan string

	unregister chan *Client
}


type Message struct {
	ID string `json:"id"`
	Data string `json:"data"`
	SessionID string `json:"session_id"`
}

func NewClient(conn *websocket.Conn) *Client {
	id := uuid.Must(uuid.NewV4()).String()
	recvCallback := map[string]func(Message){}

	return &Client{
		id:   id,
		conn: conn,
		recvCallback: recvCallback,
		send: make(chan string, 10),
	}
}

func (c *Client) ListenRecv() {
	defer func() {
		c.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	for {
		_, message, err := c.conn.ReadMessage()
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

		if callback, ok := c.recvCallback[wspacket.ID]; ok {
			go callback(wspacket)
		}
	}
}

func (c *Client) ListenSend() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			data, err := json.Marshal(message)
			if err != nil {
				return
			}
			c.conn.WriteMessage(websocket.TextMessage, data)
		}
	}
}