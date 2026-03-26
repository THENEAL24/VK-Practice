package handler

import (
	"net/http"
)

func NewRouter(quiz *QuizHandler, room *RoomHandler, game *GameHandler) *http.ServeMux {
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// Quiz endpoints
	mux.HandleFunc("POST /api/quizzes", quiz.Create)
	mux.HandleFunc("GET /api/quizzes/{code}", quiz.GetByCode)
	mux.HandleFunc("DELETE /api/quizzes/{code}", quiz.Delete)

	// Room endpoints
	mux.HandleFunc("GET /api/rooms/{code}", room.Get)
	mux.HandleFunc("POST /api/rooms/{code}/join", room.Join)
	mux.HandleFunc("PATCH /api/rooms/{code}/ready", room.UpdateReady)
	mux.HandleFunc("POST /api/rooms/{code}/start", room.Start)
	mux.HandleFunc("DELETE /api/rooms/{code}/players/{playerId}", room.KickPlayer)

	// Game endpoints
	mux.HandleFunc("POST /api/games/{code}/answer", game.SubmitAnswer)
	mux.HandleFunc("POST /api/games/{code}/results", game.SaveResult)
	mux.HandleFunc("GET /api/games/{code}/results", game.GetResults)

	return mux
}
