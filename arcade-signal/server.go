package main

type Server struct {
	browserClients map[*Client]bool
	workerClients map[*Client]bool

	registerBrowserClient chan *Client
	unregisterBrowserClient chan *Client
	registerWorkerClients chan *Client
	unregisterWorkerClients chan *Client
}

func NewServer() *Server {
	return &Server{
		browserClients:    make(map[*Client]bool),
		registerBrowserClient:   make(chan *Client),
		unregisterBrowserClient: make(chan *Client),
		workerClients:    make(map[*Client]bool),
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