package service

import (
	"context"
	"fmt"

	"github.com/THENEAL24/VK-Practice/backend/db/sqlc"
	"github.com/THENEAL24/VK-Practice/backend/internal/model"
	"github.com/jackc/pgx/v5/pgtype"
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
	_, err = s.q.CreateGameResult(ctx, sqlc.CreateGameResultParams{
		RoomID:         room.ID,
		PlayerID:       playerUUID,
		Score:          int32(req.Score),
		CorrectAnswers: int32(req.CorrectAnswers),
		TotalQuestions: int32(req.TotalQuestions),
	})
	if err != nil {
		return nil, fmt.Errorf("create result: %w", err)
	}

	return &model.GameResultResponse{
		Code:           roomCode,
		Score:          req.Score,
		CorrectAnswers: req.CorrectAnswers,
		TotalQuestions: req.TotalQuestions,
		QuizName:       quiz.Name,
	}, nil
}

func (s *GameService) GetResults(ctx context.Context, roomCode string) ([]model.GameResultResponse, error) {
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

	playerIDs := make([]pgtype.UUID, 0, len(results))
	for _, r := range results {
		playerIDs = append(playerIDs, r.PlayerID)
	}

	playerMap := make(map[string]string)
	for _, pid := range playerIDs {
		p, err := s.q.GetPlayerByID(ctx, pid)
		if err == nil {
			playerMap[uuidToString(p.ID)] = p.Name
		}
	}

	var resp []model.GameResultResponse
	for _, r := range results {
		resp = append(resp, model.GameResultResponse{
			Code:           roomCode,
			Score:          int(r.Score),
			CorrectAnswers: int(r.CorrectAnswers),
			TotalQuestions: int(r.TotalQuestions),
			QuizName:       quiz.Name,
		})
	}

	return resp, nil
}
