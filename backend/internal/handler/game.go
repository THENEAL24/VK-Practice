package handler

import (
	"net/http"

	"github.com/THENEAL24/VK-Practice/backend/internal/model"
	"github.com/THENEAL24/VK-Practice/backend/internal/service"
)

type GameHandler struct {
	svc *service.GameService
}

func NewGameHandler(svc *service.GameService) *GameHandler {
	return &GameHandler{svc: svc}
}

func (h *GameHandler) SubmitAnswer(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")

	var req model.SubmitAnswerRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	resp, err := h.svc.SubmitAnswer(r.Context(), code, req)
	if err != nil {
		if service.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "room or quiz not found")
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *GameHandler) SaveResult(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")

	var req model.SaveResultRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	resp, err := h.svc.SaveResult(r.Context(), code, req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, resp)
}

func (h *GameHandler) GetResults(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")

	resp, err := h.svc.GetResults(r.Context(), code)
	if err != nil {
		if service.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "room not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, resp)
}
