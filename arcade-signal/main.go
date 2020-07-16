package main

import (
	"flag"
	"log"
	"net/http"
)

var addr = flag.String("addr", ":3000", "http service address")

func main() {
	server := NewServer()
	go server.run()
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		ServeBrowserWs(server, w, r)
	})
	http.HandleFunc("/wws", func(w http.ResponseWriter, r *http.Request) {
		ServeWorkerWs(server, w, r)
	})
	err := http.ListenAndServe(*addr, nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

