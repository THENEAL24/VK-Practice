package model

import "time"

// --- Request DTOs ---

type CreateQuizRequest struct {
	Settings  QuizSettingsDTO  `json:"settings"`
	Questions []QuestionDTO    `json:"questions"`
}

type QuizSettingsDTO struct {
	Name            string `json:"name"`
	Difficulty      string `json:"difficulty"`
	QuestionsCount  int    `json:"questionsCount"`
	TimePerQuestion int    `json:"timePerQuestion"`
	IsPublic        bool   `json:"isPublic"`
}

type QuestionDTO struct {
	ID       int         `json:"id"`
	Question string      `json:"question"`
	Answers  []AnswerDTO `json:"answers"`
}

type AnswerDTO struct {
	ID        int    `json:"id"`
	Text      string `json:"text"`
	IsCorrect bool   `json:"isCorrect"`
}

type JoinRoomRequest struct {
	PlayerName string `json:"playerName"`
}

type UpdateReadyRequest struct {
	PlayerID string `json:"playerId"`
	IsReady  bool   `json:"isReady"`
}

type StartGameRequest struct {
	PlayerID string `json:"playerId"`
}

type SubmitAnswerRequest struct {
	PlayerID        string `json:"playerId"`
	QuestionIndex   int    `json:"questionIndex"`
	SelectedAnswers []int  `json:"selectedAnswers"`
}

type SaveResultRequest struct {
	PlayerID       string `json:"playerId"`
	Score          int    `json:"score"`
	CorrectAnswers int    `json:"correctAnswers"`
	TotalQuestions int    `json:"totalQuestions"`
}

// --- Response DTOs (mirror frontend types) ---

type QuizResponse struct {
	Code      string           `json:"code"`
	Settings  QuizSettingsDTO  `json:"settings"`
	Questions []QuestionDTO    `json:"questions"`
	CreatedAt time.Time        `json:"createdAt"`
}

type RoomResponse struct {
	Code            string          `json:"code"`
	QuizCode        string          `json:"quizCode"`
	HostID          string          `json:"hostId"`
	Players         []PlayerDTO     `json:"players"`
	Status          string          `json:"status"`
	CurrentQuestion int             `json:"currentQuestion"`
}

type PlayerDTO struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	IsReady bool   `json:"isReady"`
	Score   int    `json:"score"`
}

type CreateQuizResponse struct {
	Quiz QuizResponse `json:"quiz"`
	Room RoomResponse `json:"room"`
}

type GameResultResponse struct {
	Code           string `json:"code"`
	Score          int    `json:"score"`
	CorrectAnswers int    `json:"correctAnswers"`
	TotalQuestions int    `json:"totalQuestions"`
	QuizName       string `json:"quizName"`
}

type AnswerCheckResponse struct {
	Correct       bool  `json:"correct"`
	CorrectIDs    []int `json:"correctIds"`
	ScoreEarned   int   `json:"scoreEarned"`
	TotalScore    int   `json:"totalScore"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}
