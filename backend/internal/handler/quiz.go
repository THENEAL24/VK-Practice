package handler

import (
	"net/http"
	"strconv"

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
			writeError(w, http.StatusBadRequest, "question text is required for question "+strconv.Itoa(i+1))
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

func (h *QuizHandler) List(w http.ResponseWriter, r *http.Request) {
	limit := int32(50)
	offset := int32(0)
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = int32(v)
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = int32(v)
		}
	}

	if authorID := r.URL.Query().Get("authorId"); authorID != "" {
		resp, err := h.svc.ListQuizzesByAuthor(r.Context(), authorID)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
		return
	}

	resp, err := h.svc.ListPublicQuizzes(r.Context(), limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *QuizHandler) Launch(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	if code == "" {
		writeError(w, http.StatusBadRequest, "code is required")
		return
	}

	var req model.LaunchQuizRequest
	if r.ContentLength > 0 {
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
			return
		}
	}

	resp, err := h.svc.LaunchQuiz(r.Context(), code, req)
	if err != nil {
		if service.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "quiz not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to launch quiz: "+err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, resp)
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
