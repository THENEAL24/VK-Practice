package ws

import (
	"log"
	"net/http"
	"net/url"
	"strings"

	"github.com/gorilla/websocket"
)

type Handler struct {
	hub            *Hub
	allowedOrigins map[string]struct{}
}

func NewHandler(hub *Hub, frontendURL string) *Handler {
	allowed := map[string]struct{}{
		"http://localhost:3000":  {},
		"http://127.0.0.1:3000":  {},
		"https://localhost:3000": {},
		"https://127.0.0.1:3000": {},
	}
	if frontendURL != "" {
		if u, err := url.Parse(frontendURL); err == nil {
			allowed[u.Scheme+"://"+u.Host] = struct{}{}
		}
	}
	return &Handler{hub: hub, allowedOrigins: allowed}
}

func (h *Handler) ServeWS(w http.ResponseWriter, r *http.Request) {
	code := normalizeRoomCode(r.PathValue("code"))
	if code == "" {
		http.Error(w, "room code required", http.StatusBadRequest)
		return
	}

	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			if origin == "" {
				return true
			}
			if _, ok := h.allowedOrigins[origin]; ok {
				return true
			}
			return strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1")
		},
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade room %s: %v", code, err)
		return
	}

	client := &Client{
		hub:      h.hub,
		conn:     conn,
		send:     make(chan []byte, 64),
		roomCode: code,
	}

	h.hub.register(client)
	h.hub.sendSnapshot(client)

	go client.writePump()
	go client.readPump()
}
