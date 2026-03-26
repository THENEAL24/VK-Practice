package handler

import (
	"net/http"

	"github.com/THENEAL24/VK-Practice/backend/internal/model"
	"github.com/THENEAL24/VK-Practice/backend/internal/service"
)

type QuizHandler struct {
	svc *service.QuizService
}

func NewQuizHandler(svc *service.QuizService) *QuizHandler {
	return &QuizHandler{svc: svc}
}

func (h *QuizHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req model.CreateQuizRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	if req.Settings.Name == "" {
		writeError(w, http.StatusBadRequest, "quiz name is required")
		return
	}
	if len(req.Questions) == 0 {
		writeError(w, http.StatusBadRequest, "at least one question is required")
		return
	}
	for i, q := range req.Questions {
		if q.Question == "" {
			writeError(w, http.StatusBadRequest, "question text is required for question "+string(rune('0'+i)))
			return
		}
		if len(q.Answers) < 2 {
			writeError(w, http.StatusBadRequest, "at least 2 answers required per question")
			return
		}
	}

	resp, err := h.svc.CreateQuiz(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create quiz: "+err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, resp)
}

func (h *QuizHandler) GetByCode(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	if code == "" {
		writeError(w, http.StatusBadRequest, "code is required")
		return
	}

	resp, err := h.svc.GetQuizByCode(r.Context(), code)
	if err != nil {
		if service.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "quiz not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get quiz: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *QuizHandler) Delete(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	if code == "" {
		writeError(w, http.StatusBadRequest, "code is required")
		return
	}

	err := h.svc.DeleteQuiz(r.Context(), code)
	if err != nil {
		if service.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "quiz not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete quiz: "+err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
