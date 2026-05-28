package service

import (
	"context"
	"fmt"

	"github.com/THENEAL24/VK-Practice/backend/db/sqlc"
	"github.com/THENEAL24/VK-Practice/backend/internal/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

type GameService struct {
	pool *pgxpool.Pool
	q    *sqlc.Queries
}

func NewGameService(pool *pgxpool.Pool) *GameService {
	return &GameService{
		pool: pool,
		q:    sqlc.New(pool),
	}
}

func (s *GameService) SubmitAnswer(ctx context.Context, roomCode string, req model.SubmitAnswerRequest) (*model.AnswerCheckResponse, error) {
	room, err := s.q.GetRoomByCode(ctx, roomCode)
	if err != nil {
		return nil, fmt.Errorf("get room: %w", err)
	}

	quiz, err := s.q.GetQuizByID(ctx, room.QuizID)
	if err != nil {
		return nil, fmt.Errorf("get quiz: %w", err)
	}

	questions, err := s.q.GetQuestionsByQuizID(ctx, quiz.ID)
	if err != nil {
		return nil, fmt.Errorf("get questions: %w", err)
	}

	if req.QuestionIndex < 0 || req.QuestionIndex >= len(questions) {
		return nil, fmt.Errorf("invalid question index: %d", req.QuestionIndex)
	}

	question := questions[req.QuestionIndex]
	answers, err := s.q.GetAnswersByQuestionID(ctx, question.ID)
	if err != nil {
		return nil, fmt.Errorf("get answers: %w", err)
	}

	var correctIDs []int
	for i, a := range answers {
		if a.IsCorrect {
			correctIDs = append(correctIDs, i)
		}
	}

	isCorrect := len(req.SelectedAnswers) == len(correctIDs)
	if isCorrect {
		correctSet := make(map[int]bool, len(correctIDs))
		for _, id := range correctIDs {
			correctSet[id] = true
		}
		for _, id := range req.SelectedAnswers {
			if !correctSet[id] {
				isCorrect = false
				break
			}
		}
	}

	scoreEarned := 0
	if isCorrect {
		scoreEarned = 100
	}

	playerUUID := stringToUUID(req.PlayerID)
	player, err := s.q.GetPlayerByID(ctx, playerUUID)
	if err != nil {
		return nil, fmt.Errorf("get player: %w", err)
	}

	newScore := int(player.Score) + scoreEarned
	_, err = s.q.UpdatePlayerScore(ctx, sqlc.UpdatePlayerScoreParams{
		ID:    playerUUID,
		Score: int32(newScore),
	})
	if err != nil {
		return nil, fmt.Errorf("update score: %w", err)
	}

	return &model.AnswerCheckResponse{
		Correct:     isCorrect,
		CorrectIDs:  correctIDs,
		ScoreEarned: scoreEarned,
		TotalScore:  newScore,
	}, nil
}

func (s *GameService) SaveResult(ctx context.Context, roomCode string, req model.SaveResultRequest) (*model.GameResultResponse, error) {
	room, err := s.q.GetRoomByCode(ctx, roomCode)
	if err != nil {
		return nil, fmt.Errorf("get room: %w", err)
	}

	quiz, err := s.q.GetQuizByID(ctx, room.QuizID)
	if err != nil {
		return nil, fmt.Errorf("get quiz: %w", err)
	}

	playerUUID := stringToUUID(req.PlayerID)
	player, err := s.q.GetPlayerByID(ctx, playerUUID)
	if err != nil {
		return nil, fmt.Errorf("get player: %w", err)
	}

	userUUID := optionalUUID(req.UserID)
	if !userUUID.Valid {
		userUUID = player.UserID
	}

	result, err := s.q.CreateGameResult(ctx, sqlc.CreateGameResultParams{
		RoomID:         room.ID,
		PlayerID:       playerUUID,
		UserID:         userUUID,
		QuizID:         quiz.ID,
		PlayerName:     player.Name,
		QuizName:       quiz.Name,
		Score:          int32(req.Score),
		CorrectAnswers: int32(req.CorrectAnswers),
		TotalQuestions: int32(req.TotalQuestions),
	})
	if err != nil {
		return nil, fmt.Errorf("create result: %w", err)
	}

	return &model.GameResultResponse{
		Code:           roomCode,
		PlayerID:       uuidToString(result.PlayerID),
		PlayerName:     result.PlayerName,
		UserID:         uuidToString(result.UserID),
		Score:          int(result.Score),
		CorrectAnswers: int(result.CorrectAnswers),
		TotalQuestions: int(result.TotalQuestions),
		QuizName:       result.QuizName,
		QuizCode:       quiz.Code,
		FinishedAt:     result.FinishedAt.Time,
	}, nil
}

func (s *GameService) GetLeaderboard(ctx context.Context, roomCode string) (*model.LeaderboardResponse, error) {
	room, err := s.q.GetRoomByCode(ctx, roomCode)
	if err != nil {
		return nil, fmt.Errorf("get room: %w", err)
	}

	quiz, err := s.q.GetQuizByID(ctx, room.QuizID)
	if err != nil {
		return nil, fmt.Errorf("get quiz: %w", err)
	}

	results, err := s.q.GetGameResultsByRoomID(ctx, room.ID)
	if err != nil {
		return nil, fmt.Errorf("get results: %w", err)
	}

	entries := make([]model.GameResultResponse, 0, len(results))
	for _, r := range results {
		entries = append(entries, model.GameResultResponse{
			Code:           roomCode,
			PlayerID:       uuidToString(r.PlayerID),
			PlayerName:     r.PlayerName,
			UserID:         uuidToString(r.UserID),
			Score:          int(r.Score),
			CorrectAnswers: int(r.CorrectAnswers),
			TotalQuestions: int(r.TotalQuestions),
			QuizName:       r.QuizName,
			QuizCode:       quiz.Code,
			FinishedAt:     r.FinishedAt.Time,
		})
	}

	return &model.LeaderboardResponse{
		Code:     roomCode,
		QuizName: quiz.Name,
		Entries:  entries,
	}, nil
}
