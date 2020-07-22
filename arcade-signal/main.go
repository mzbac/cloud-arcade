package main

import (
	"flag"
	"log"
	"net/http"
)

var addr = flag.String("addr", ":8000", "http service address")

func main() {
	server := NewServer()
	go server.run()
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)
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
