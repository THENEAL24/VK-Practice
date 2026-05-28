package handler

import (
	"context"
	"net/http"

	"github.com/THENEAL24/VK-Practice/backend/internal/model"
	"github.com/THENEAL24/VK-Practice/backend/internal/service"
	"github.com/THENEAL24/VK-Practice/backend/internal/ws"
)

type RoomBroadcaster interface {
	BroadcastRoom(ctx context.Context, roomCode string)
	StartGame(ctx context.Context, roomCode string)
}

type RoomHandler struct {
	svc *service.RoomService
	hub RoomBroadcaster
}

func NewRoomHandler(svc *service.RoomService, hub RoomBroadcaster) *RoomHandler {
	return &RoomHandler{svc: svc, hub: hub}
}

func (h *RoomHandler) Get(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	if code == "" {
		writeError(w, http.StatusBadRequest, "code is required")
		return
	}

	resp, err := h.svc.GetRoom(r.Context(), code)
	if err != nil {
		if service.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "room not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get room: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *RoomHandler) Join(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	if code == "" {
		writeError(w, http.StatusBadRequest, "code is required")
		return
	}

	var req model.JoinRoomRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	resp, err := h.svc.JoinRoom(r.Context(), code, req)
	if err != nil {
		if service.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "room not found")
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if h.hub != nil {
		h.hub.BroadcastRoom(r.Context(), code)
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *RoomHandler) UpdateReady(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")

	var req model.UpdateReadyRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	resp, err := h.svc.UpdateReady(r.Context(), code, req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if h.hub != nil {
		h.hub.BroadcastRoom(r.Context(), code)
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *RoomHandler) Start(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")

	var req model.StartGameRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	resp, err := h.svc.StartGame(r.Context(), code, req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if h.hub != nil {
		h.hub.BroadcastRoom(r.Context(), code)
		h.hub.StartGame(r.Context(), code)
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *RoomHandler) KickPlayer(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	playerID := r.PathValue("playerId")

	hostID := r.URL.Query().Get("hostId")
	if hostID == "" {
		writeError(w, http.StatusBadRequest, "hostId query parameter is required")
		return
	}

	resp, err := h.svc.KickPlayer(r.Context(), code, hostID, playerID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if h.hub != nil {
		h.hub.BroadcastRoom(r.Context(), code)
	}

	writeJSON(w, http.StatusOK, resp)
}

// Ensure ws.Hub satisfies RoomBroadcaster at compile time.
var _ RoomBroadcaster = (*ws.Hub)(nil)
