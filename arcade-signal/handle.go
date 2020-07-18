package main

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func ServeBrowserWs(server *Server, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := NewClient(conn)
	client.unregister = server.unregisterBrowserClient
	server.registerBrowserClient <- client

	// to do register recv handler
	server.RouteBrowser(client)
	go client.ListenRecv()
	go client.ListenSend()
}

func ServeWorkerWs(server *Server, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := NewClient(conn)
	client.unregister = server.unregisterWorkerClients
	server.registerWorkerClients <- client

	log.Println("worker id :", client.id)
	// to do register recv handler
	server.RouteWorker(client)
	go client.ListenRecv()
	go client.ListenSend()
}
