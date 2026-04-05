package main

import (
	"log"
	"net/http"

	"pea-ntl-api/internal/app"
)

func main() {
	server, err := app.NewServer()
	if err != nil {
		log.Fatalf("failed to initialize server: %v", err)
	}
	log.Printf("starting server on :%s", server.Config.Port)
	if err := http.ListenAndServe(":"+server.Config.Port, server.Handler); err != nil {
		log.Fatalf("server exited with error: %v", err)
	}
}
