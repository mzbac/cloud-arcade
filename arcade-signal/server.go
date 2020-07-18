package main

import (
	"log"
)

type Server struct {
	browserClients map[*Client]bool
	workerClients  map[*Client]bool

	registerBrowserClient   chan *Client
	unregisterBrowserClient chan *Client
	registerWorkerClients   chan *Client
	unregisterWorkerClients chan *Client
}

func NewServer() *Server {
	return &Server{
		browserClients:          make(map[*Client]bool),
		registerBrowserClient:   make(chan *Client),
		unregisterBrowserClient: make(chan *Client),
		workerClients:           make(map[*Client]bool),
		registerWorkerClients:   make(chan *Client),
		unregisterWorkerClients: make(chan *Client),
	}
}

func (h *Server) run() {
	for {
		select {
		case client := <-h.registerBrowserClient:
			h.browserClients[client] = true
		case client := <-h.registerWorkerClients:
			h.workerClients[client] = true
		case client := <-h.unregisterBrowserClient:
			if _, ok := h.browserClients[client]; ok {
				delete(h.browserClients, client)
				close(client.send)
			}
		case client := <-h.unregisterWorkerClients:
			if _, ok := h.workerClients[client]; ok {
				delete(h.workerClients, client)
				close(client.send)
			}
		}
	}
}

func (h *Server) RouteBrowser(client *Client) {
	client.recvCallback["initwebrtc"] = func(req Message) {
		log.Println("received initwebrtc session id :", req.SessionID)
		for k := range h.workerClients {
			if k.id == req.SessionID {
				req.SessionID = client.id
				log.Println("send initwebrtc to worker")
				k.send <- req
				break
			}
		}

	}

	client.recvCallback["answer"] = func(req Message) {
		log.Println("received answer")
		for k := range h.workerClients {
			if k.id == req.SessionID {
				req.SessionID = client.id
				k.send <- req
				break
			}
		}

	}

	client.recvCallback["candidate"] = func(req Message) {
		log.Println("received candidate")
		for k := range h.workerClients {
			if k.id == req.SessionID {
				req.SessionID = client.id
				k.send <- req
				break
			}
		}

	}

	client.recvCallback["joinRoom"] = func(req Message) {
		log.Println("received joinRoom")
		for k := range h.workerClients {
			if k.id == req.SessionID {
				req.SessionID = client.id
				k.send <- req
				break
			}
		}

	}
}

func (h *Server) RouteWorker(client *Client) {
	client.recvCallback["offer"] = func(req Message) {
		log.Println("received worker offer")
		for k := range h.browserClients {
			if k.id == req.SessionID {
				req.SessionID = ""
				k.send <- req
				break
			}
		}
	}

	client.recvCallback["candidate"] = func(req Message) {
		log.Println("received worker candidate")
		for k := range h.browserClients {
			if k.id == req.SessionID {
				req.SessionID = ""
				k.send <- req
				break
			}
		}
	}
}
