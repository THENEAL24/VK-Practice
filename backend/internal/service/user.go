package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/THENEAL24/VK-Practice/backend/db/sqlc"
	"github.com/THENEAL24/VK-Practice/backend/internal/model"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserService struct {
	pool *pgxpool.Pool
	q    *sqlc.Queries
}

func NewUserService(pool *pgxpool.Pool) *UserService {
	return &UserService{
		pool: pool,
		q:    sqlc.New(pool),
	}
}

// CreateGuest creates a lightweight user without email/password.
// Used for legacy "guest profile" flow on the frontend before sign-in is wired up.
func (s *UserService) CreateGuest(ctx context.Context, req model.CreateUserRequest) (*model.UserResponse, error) {
	name := strings.TrimSpace(req.Name)
	nickname := strings.TrimSpace(req.Nickname)
	if name == "" || nickname == "" {
		return nil, fmt.Errorf("name and nickname are required")
	}
	if len(nickname) > 50 {
		return nil, fmt.Errorf("nickname must be 50 characters or less")
	}

	user, err := s.q.CreateUser(ctx, sqlc.CreateUserParams{
		Name:         name,
		Nickname:     nickname,
		Email:        pgtype.Text{},
		PasswordHash: pgtype.Text{},
		VkID:         pgtype.Text{},
		IsVerified:   true,
		VerifiedAt:   pgtype.Timestamptz{Time: time.Now(), Valid: true},
	})
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	return userToResponse(user), nil
}

func (s *UserService) GetUser(ctx context.Context, id string) (*model.UserResponse, error) {
	uid := stringToUUID(id)
	if !uid.Valid {
		return nil, fmt.Errorf("invalid user id")
	}
	user, err := s.q.GetUserByID(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	return userToResponse(user), nil
}

func (s *UserService) UpdateUser(ctx context.Context, id string, req model.UpdateUserRequest) (*model.UserResponse, error) {
	uid := stringToUUID(id)
	if !uid.Valid {
		return nil, fmt.Errorf("invalid user id")
	}
	name := strings.TrimSpace(req.Name)
	nickname := strings.TrimSpace(req.Nickname)
	if name == "" || nickname == "" {
		return nil, fmt.Errorf("name and nickname are required")
	}
	user, err := s.q.UpdateUser(ctx, sqlc.UpdateUserParams{
		ID:       uid,
		Name:     name,
		Nickname: nickname,
	})
	if err != nil {
		return nil, fmt.Errorf("update user: %w", err)
	}
	return userToResponse(user), nil
}

func (s *UserService) GetHistory(ctx context.Context, userID string, limit int32) ([]model.GameResultResponse, error) {
	uid := stringToUUID(userID)
	if !uid.Valid {
		return nil, fmt.Errorf("invalid user id")
	}
	if limit <= 0 {
		limit = 50
	}
	results, err := s.q.GetGameResultsByUserID(ctx, sqlc.GetGameResultsByUserIDParams{
		UserID: uid,
		Limit:  limit,
	})
	if err != nil {
		return nil, fmt.Errorf("get history: %w", err)
	}

	out := make([]model.GameResultResponse, 0, len(results))
	for _, r := range results {
		roomCode := ""
		quizCode := ""
		if room, err := s.q.GetRoomByID(ctx, r.RoomID); err == nil {
			roomCode = room.Code
		}
		if r.QuizID.Valid {
			if quiz, err := s.q.GetQuizByID(ctx, r.QuizID); err == nil {
				quizCode = quiz.Code
			}
		}
		out = append(out, model.GameResultResponse{
			Code:           roomCode,
			PlayerID:       uuidToString(r.PlayerID),
			PlayerName:     r.PlayerName,
			UserID:         uuidToString(r.UserID),
			Score:          int(r.Score),
			CorrectAnswers: int(r.CorrectAnswers),
			TotalQuestions: int(r.TotalQuestions),
			QuizName:       r.QuizName,
			QuizCode:       quizCode,
			FinishedAt:     r.FinishedAt.Time,
		})
	}
	return out, nil
}

func userToResponse(u sqlc.User) *model.UserResponse {
	resp := &model.UserResponse{
		ID:         uuidToString(u.ID),
		Name:       u.Name,
		Nickname:   u.Nickname,
		IsVerified: u.IsVerified,
		HasEmail:   u.Email.Valid,
		CreatedAt:  u.CreatedAt.Time,
	}
	if u.Email.Valid {
		resp.Email = u.Email.String
	}
	if u.VkID.Valid {
		resp.VkID = u.VkID.String
	}
	return resp
}
