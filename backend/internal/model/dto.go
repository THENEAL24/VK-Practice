package model

import "time"

// --- Request DTOs ---

type CreateQuizRequest struct {
	Settings  QuizSettingsDTO `json:"settings"`
	Questions []QuestionDTO   `json:"questions"`
	UserID    string          `json:"userId,omitempty"`
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
	UserID     string `json:"userId,omitempty"`
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
	UserID         string `json:"userId,omitempty"`
	Score          int    `json:"score"`
	CorrectAnswers int    `json:"correctAnswers"`
	TotalQuestions int    `json:"totalQuestions"`
}

type CreateUserRequest struct {
	Name     string `json:"name"`
	Nickname string `json:"nickname"`
}

type UpdateUserRequest struct {
	Name     string `json:"name"`
	Nickname string `json:"nickname"`
}

type LaunchQuizRequest struct {
	UserID string `json:"userId,omitempty"`
}

// --- Auth DTOs ---

type RegisterRequest struct {
	Name     string `json:"name"`
	Nickname string `json:"nickname,omitempty"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterResponse struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
}

type VerifyEmailRequest struct {
	UserID string `json:"userId"`
	Code   string `json:"code"`
}

type ResendCodeRequest struct {
	Email string `json:"email"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type VKLoginRequest struct {
	VkID string `json:"vkId"`
	Name string `json:"name,omitempty"`
}

type AuthResponse struct {
	Token                string       `json:"token,omitempty"`
	User                 UserResponse `json:"user"`
	RequiresVerification bool         `json:"requiresVerification,omitempty"`
	UserID               string       `json:"userId,omitempty"`
	Email                string       `json:"email,omitempty"`
}

// --- Response DTOs (mirror frontend types) ---

type QuizResponse struct {
	Code           string          `json:"code"`
	Settings       QuizSettingsDTO `json:"settings"`
	Questions      []QuestionDTO   `json:"questions"`
	CreatedAt      time.Time       `json:"createdAt"`
	AuthorUserID   string          `json:"authorUserId,omitempty"`
	AuthorNickname string          `json:"authorNickname,omitempty"`
}

type QuizSummaryDTO struct {
	Code            string    `json:"code"`
	Name            string    `json:"name"`
	Difficulty      string    `json:"difficulty"`
	QuestionsCount  int       `json:"questionsCount"`
	TimePerQuestion int       `json:"timePerQuestion"`
	IsPublic        bool      `json:"isPublic"`
	AuthorUserID    string    `json:"authorUserId,omitempty"`
	AuthorNickname  string    `json:"authorNickname,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
}

type RoomResponse struct {
	Code            string      `json:"code"`
	QuizCode        string      `json:"quizCode"`
	HostID          string      `json:"hostId"`
	Players         []PlayerDTO `json:"players"`
	Status          string      `json:"status"`
	CurrentQuestion int         `json:"currentQuestion"`
}

type PlayerDTO struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	IsReady bool   `json:"isReady"`
	Score   int    `json:"score"`
	UserID  string `json:"userId,omitempty"`
}

// CreateQuizResponse is returned when a quiz is created without immediately launching a room.
// When `room` is null, callers should invoke `/api/quizzes/{code}/launch` to start a game.
type CreateQuizResponse struct {
	Quiz QuizResponse  `json:"quiz"`
	Room *RoomResponse `json:"room,omitempty"`
}

type GameResultResponse struct {
	Code           string    `json:"code"`
	PlayerID       string    `json:"playerId"`
	PlayerName     string    `json:"playerName"`
	UserID         string    `json:"userId,omitempty"`
	Score          int       `json:"score"`
	CorrectAnswers int       `json:"correctAnswers"`
	TotalQuestions int       `json:"totalQuestions"`
	QuizName       string    `json:"quizName"`
	QuizCode       string    `json:"quizCode,omitempty"`
	FinishedAt     time.Time `json:"finishedAt"`
}

type LeaderboardResponse struct {
	Code     string               `json:"code"`
	QuizName string               `json:"quizName"`
	Entries  []GameResultResponse `json:"entries"`
}

type AnswerCheckResponse struct {
	Correct     bool  `json:"correct"`
	CorrectIDs  []int `json:"correctIds"`
	ScoreEarned int   `json:"scoreEarned"`
	TotalScore  int   `json:"totalScore"`
}

type UserResponse struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Nickname   string    `json:"nickname"`
	Email      string    `json:"email,omitempty"`
	VkID       string    `json:"vkId,omitempty"`
	IsVerified bool      `json:"isVerified"`
	HasEmail   bool      `json:"hasEmail"`
	CreatedAt  time.Time `json:"createdAt"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}
