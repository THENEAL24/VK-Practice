package service

import (
	"context"
	"fmt"

	"github.com/THENEAL24/VK-Practice/backend/db/sqlc"
	"github.com/THENEAL24/VK-Practice/backend/internal/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RoomService struct {
	pool *pgxpool.Pool
	q    *sqlc.Queries
}

func NewRoomService(pool *pgxpool.Pool) *RoomService {
	return &RoomService{
		pool: pool,
		q:    sqlc.New(pool),
	}
}

func (s *RoomService) GetRoom(ctx context.Context, code string) (*model.RoomResponse, error) {
	room, err := s.q.GetRoomByCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("get room: %w", err)
	}

	players, err := s.q.GetPlayersByRoomID(ctx, room.ID)
	if err != nil {
		return nil, fmt.Errorf("get players: %w", err)
	}

	quiz, err := s.q.GetQuizByID(ctx, room.QuizID)
	if err != nil {
		return nil, fmt.Errorf("get quiz: %w", err)
	}

	var playerDTOs []model.PlayerDTO
	for _, p := range players {
		playerDTOs = append(playerDTOs, model.PlayerDTO{
			ID:      uuidToString(p.ID),
			Name:    p.Name,
			IsReady: p.IsReady,
			Score:   int(p.Score),
			UserID:  uuidToString(p.UserID),
		})
	}

	return &model.RoomResponse{
		Code:            room.Code,
		QuizCode:        quiz.Code,
		HostID:          uuidToString(room.HostPlayerID),
		Players:         playerDTOs,
		Status:          room.Status,
		CurrentQuestion: int(room.CurrentQuestion),
	}, nil
}

func (s *RoomService) JoinRoom(ctx context.Context, code string, req model.JoinRoomRequest) (*model.RoomResponse, error) {
	room, err := s.q.GetRoomByCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("get room: %w", err)
	}

	if room.Status != "waiting" {
		return nil, fmt.Errorf("room is not accepting players (status: %s)", room.Status)
	}

	playerName := req.PlayerName
	userUUID := optionalUUID(req.UserID)

	if userUUID.Valid {
		if existing, err := s.q.GetPlayerByRoomAndUser(ctx, sqlc.GetPlayerByRoomAndUserParams{
			RoomID: room.ID,
			UserID: userUUID,
		}); err == nil {
			if playerName != "" && playerName != existing.Name {
				_, _ = s.q.UpdatePlayerName(ctx, sqlc.UpdatePlayerNameParams{
					ID:   existing.ID,
					Name: playerName,
				})
			}
			return s.GetRoom(ctx, code)
		}
		if u, err := s.q.GetUserByID(ctx, userUUID); err == nil && playerName == "" {
			playerName = u.Name
		}
	}

	if playerName == "" {
		playerName = "Игрок"
	}

	_, err = s.q.CreatePlayer(ctx, sqlc.CreatePlayerParams{
		RoomID:  room.ID,
		UserID:  userUUID,
		Name:    playerName,
		IsReady: false,
		Score:   0,
	})
	if err != nil {
		return nil, fmt.Errorf("create player: %w", err)
	}

	return s.GetRoom(ctx, code)
}

func (s *RoomService) UpdateReady(ctx context.Context, code string, req model.UpdateReadyRequest) (*model.RoomResponse, error) {
	_, err := s.q.GetRoomByCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("get room: %w", err)
	}

	playerUUID := stringToUUID(req.PlayerID)
	_, err = s.q.UpdatePlayerReady(ctx, sqlc.UpdatePlayerReadyParams{
		ID:      playerUUID,
		IsReady: req.IsReady,
	})
	if err != nil {
		return nil, fmt.Errorf("update ready: %w", err)
	}

	return s.GetRoom(ctx, code)
}

func (s *RoomService) StartGame(ctx context.Context, code string, req model.StartGameRequest) (*model.RoomResponse, error) {
	room, err := s.q.GetRoomByCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("get room: %w", err)
	}

	hostID := uuidToString(room.HostPlayerID)
	if hostID != req.PlayerID {
		return nil, fmt.Errorf("only the host can start the game")
	}

	if room.Status != "waiting" {
		return nil, fmt.Errorf("game has already started")
	}

	players, err := s.q.GetPlayersByRoomID(ctx, room.ID)
	if err != nil {
		return nil, fmt.Errorf("get players: %w", err)
	}

	for _, p := range players {
		if uuidToString(p.ID) == hostID {
			continue
		}
		if !p.IsReady {
			return nil, fmt.Errorf("not all players are ready")
		}
	}

	_, err = s.q.UpdateRoomStatus(ctx, sqlc.UpdateRoomStatusParams{
		ID:              room.ID,
		Status:          "playing",
		CurrentQuestion: 0,
	})
	if err != nil {
		return nil, fmt.Errorf("update room status: %w", err)
	}

	return s.GetRoom(ctx, code)
}

func (s *RoomService) FinishGame(ctx context.Context, code string) (*model.RoomResponse, error) {
	room, err := s.q.GetRoomByCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("get room: %w", err)
	}

	_, err = s.q.UpdateRoomStatus(ctx, sqlc.UpdateRoomStatusParams{
		ID:              room.ID,
		Status:          "finished",
		CurrentQuestion: room.CurrentQuestion,
	})
	if err != nil {
		return nil, fmt.Errorf("update room status: %w", err)
	}

	return s.GetRoom(ctx, code)
}

func (s *RoomService) GetQuizTiming(ctx context.Context, roomCode string) (timePerQuestion int, totalQuestions int, err error) {
	room, err := s.q.GetRoomByCode(ctx, roomCode)
	if err != nil {
		return 0, 0, fmt.Errorf("get room: %w", err)
	}
	quiz, err := s.q.GetQuizByID(ctx, room.QuizID)
	if err != nil {
		return 0, 0, fmt.Errorf("get quiz: %w", err)
	}
	questions, err := s.q.GetQuestionsByQuizID(ctx, quiz.ID)
	if err != nil {
		return 0, 0, fmt.Errorf("get questions: %w", err)
	}
	return int(quiz.TimePerQuestion), len(questions), nil
}

func (s *RoomService) KickPlayer(ctx context.Context, code string, hostPlayerID string, targetPlayerID string) (*model.RoomResponse, error) {
	room, err := s.q.GetRoomByCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("get room: %w", err)
	}

	if uuidToString(room.HostPlayerID) != hostPlayerID {
		return nil, fmt.Errorf("only the host can kick players")
	}

	targetUUID := stringToUUID(targetPlayerID)
	err = s.q.DeletePlayer(ctx, targetUUID)
	if err != nil {
		return nil, fmt.Errorf("delete player: %w", err)
	}

	return s.GetRoom(ctx, code)
}
