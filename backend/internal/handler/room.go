package handler

import (
	"net/http"

	"github.com/THENEAL24/VK-Practice/backend/internal/model"
	"github.com/THENEAL24/VK-Practice/backend/internal/service"
)

type RoomHandler struct {
	svc *service.RoomService
}

func NewRoomHandler(svc *service.RoomService) *RoomHandler {
	return &RoomHandler{svc: svc}
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

	if req.PlayerName == "" {
		req.PlayerName = "Игрок"
	}

	resp, err := h.svc.JoinRoom(r.Context(), code, req.PlayerName)
	if err != nil {
		if service.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "room not found")
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
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

	writeJSON(w, http.StatusOK, resp)
}
