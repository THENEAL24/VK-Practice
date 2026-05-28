package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"math/big"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/THENEAL24/VK-Practice/backend/db/sqlc"
	"github.com/THENEAL24/VK-Practice/backend/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

const (
	sessionTTL = 30 * 24 * time.Hour
	codeTTL    = 15 * time.Minute
	codePurpose = "email_verify"
)

var emailRegex = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

// AuthService handles registration, verification, login and session management.
type AuthService struct {
	pool *pgxpool.Pool
	q    *sqlc.Queries
}

func NewAuthService(pool *pgxpool.Pool) *AuthService {
	return &AuthService{pool: pool, q: sqlc.New(pool)}
}

// ErrEmailNotVerified is returned by Login when the user has not verified email yet.
var ErrEmailNotVerified = errors.New("email is not verified")

// ErrInvalidCredentials is returned on wrong email/password.
var ErrInvalidCredentials = errors.New("invalid email or password")

func (s *AuthService) Register(ctx context.Context, req model.RegisterRequest) (*model.RegisterResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	name := strings.TrimSpace(req.Name)
	nickname := strings.TrimSpace(req.Nickname)

	if !emailRegex.MatchString(email) {
		return nil, fmt.Errorf("invalid email")
	}
	if len(req.Password) < 6 {
		return nil, fmt.Errorf("password must be at least 6 characters")
	}
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if nickname == "" {
		nickname = nicknameFromEmail(email)
	}
	nickname = sanitizeNickname(nickname)

	if existing, err := s.q.GetUserByEmail(ctx, pgtype.Text{String: email, Valid: true}); err == nil {
		if existing.IsVerified {
			return nil, fmt.Errorf("email is already registered")
		}
		// Email exists but not verified — re-issue a verification code so the user can finish signup.
		return s.issueCodeAndRespond(ctx, existing.ID, existing.Email.String)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	finalNick, err := s.findFreeNickname(ctx, nickname)
	if err != nil {
		return nil, err
	}

	user, err := s.q.CreateUser(ctx, sqlc.CreateUserParams{
		Name:         name,
		Nickname:     finalNick,
		Email:        pgtype.Text{String: email, Valid: true},
		PasswordHash: pgtype.Text{String: string(hash), Valid: true},
		VkID:         pgtype.Text{},
		IsVerified:   false,
		VerifiedAt:   pgtype.Timestamptz{},
	})
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	return s.issueCodeAndRespond(ctx, user.ID, email)
}

func (s *AuthService) ResendCode(ctx context.Context, email string) (*model.RegisterResponse, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	user, err := s.q.GetUserByEmail(ctx, pgtype.Text{String: email, Valid: true})
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}
	if user.IsVerified {
		return nil, fmt.Errorf("email is already verified")
	}
	return s.issueCodeAndRespond(ctx, user.ID, email)
}

func (s *AuthService) issueCodeAndRespond(ctx context.Context, userID pgtype.UUID, email string) (*model.RegisterResponse, error) {
	_ = s.q.InvalidatePreviousCodes(ctx, sqlc.InvalidatePreviousCodesParams{
		UserID:  userID,
		Purpose: codePurpose,
	})

	code := generateNumericCode(6)
	_, err := s.q.CreateVerificationCode(ctx, sqlc.CreateVerificationCodeParams{
		UserID:    userID,
		Code:      code,
		Purpose:   codePurpose,
		ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(codeTTL), Valid: true},
	})
	if err != nil {
		return nil, fmt.Errorf("create code: %w", err)
	}

	// Mock email delivery — log code to stdout so it appears in docker logs.
	deliverCodeToInbox(email, code)

	return &model.RegisterResponse{
		UserID: uuidToString(userID),
		Email:  email,
	}, nil
}

func (s *AuthService) VerifyEmail(ctx context.Context, req model.VerifyEmailRequest) (*model.AuthResponse, error) {
	uid := stringToUUID(req.UserID)
	if !uid.Valid {
		return nil, fmt.Errorf("invalid user id")
	}
	code := strings.TrimSpace(req.Code)
	if code == "" {
		return nil, fmt.Errorf("code is required")
	}

	stored, err := s.q.GetLatestVerificationCode(ctx, sqlc.GetLatestVerificationCodeParams{
		UserID:  uid,
		Purpose: codePurpose,
	})
	if err != nil {
		return nil, fmt.Errorf("code not found or expired")
	}
	if !stored.ExpiresAt.Valid || stored.ExpiresAt.Time.Before(time.Now()) {
		return nil, fmt.Errorf("code is expired")
	}
	if stored.Code != code {
		return nil, fmt.Errorf("invalid code")
	}

	if err := s.q.MarkCodeUsed(ctx, stored.ID); err != nil {
		return nil, fmt.Errorf("mark used: %w", err)
	}

	user, err := s.q.MarkUserVerified(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("mark verified: %w", err)
	}

	token, err := s.createSession(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	return &model.AuthResponse{
		Token: token,
		User:  *userToResponse(user),
	}, nil
}

func (s *AuthService) Login(ctx context.Context, req model.LoginRequest) (*model.AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	user, err := s.q.GetUserByEmail(ctx, pgtype.Text{String: email, Valid: true})
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if !user.PasswordHash.Valid {
		return nil, ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash.String), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}
	if !user.IsVerified {
		return &model.AuthResponse{
			RequiresVerification: true,
			UserID:               uuidToString(user.ID),
			Email:                user.Email.String,
		}, ErrEmailNotVerified
	}

	token, err := s.createSession(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	return &model.AuthResponse{
		Token: token,
		User:  *userToResponse(user),
	}, nil
}

// VKLogin is a stub for ВК OAuth. It accepts a vkId + name (already obtained on the client)
// and creates/refreshes a session without email verification.
func (s *AuthService) VKLogin(ctx context.Context, req model.VKLoginRequest) (*model.AuthResponse, error) {
	vkID := strings.TrimSpace(req.VkID)
	if vkID == "" {
		return nil, fmt.Errorf("vkId is required")
	}

	if user, err := s.q.GetUserByVKID(ctx, pgtype.Text{String: vkID, Valid: true}); err == nil {
		token, err := s.createSession(ctx, user.ID)
		if err != nil {
			return nil, err
		}
		return &model.AuthResponse{Token: token, User: *userToResponse(user)}, nil
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = "Пользователь ВК"
	}
	nick, err := s.findFreeNickname(ctx, sanitizeNickname("vk_"+vkID))
	if err != nil {
		return nil, err
	}

	user, err := s.q.CreateUser(ctx, sqlc.CreateUserParams{
		Name:         name,
		Nickname:     nick,
		Email:        pgtype.Text{},
		PasswordHash: pgtype.Text{},
		VkID:         pgtype.Text{String: vkID, Valid: true},
		IsVerified:   true,
		VerifiedAt:   pgtype.Timestamptz{Time: time.Now(), Valid: true},
	})
	if err != nil {
		return nil, fmt.Errorf("create vk user: %w", err)
	}

	token, err := s.createSession(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	return &model.AuthResponse{Token: token, User: *userToResponse(user)}, nil
}

func (s *AuthService) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	return s.q.DeleteSession(ctx, token)
}

// LookupSession finds the user behind the bearer token (or returns ErrNoRows).
func (s *AuthService) LookupSession(ctx context.Context, token string) (*model.UserResponse, error) {
	if token == "" {
		return nil, pgx.ErrNoRows
	}
	sess, err := s.q.GetSession(ctx, token)
	if err != nil {
		return nil, err
	}
	user, err := s.q.GetUserByID(ctx, sess.UserID)
	if err != nil {
		return nil, err
	}
	return userToResponse(user), nil
}

func (s *AuthService) createSession(ctx context.Context, userID pgtype.UUID) (string, error) {
	token, err := generateToken()
	if err != nil {
		return "", err
	}
	_, err = s.q.CreateSession(ctx, sqlc.CreateSessionParams{
		Token:     token,
		UserID:    userID,
		ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(sessionTTL), Valid: true},
	})
	if err != nil {
		return "", fmt.Errorf("create session: %w", err)
	}
	return token, nil
}

func (s *AuthService) findFreeNickname(ctx context.Context, base string) (string, error) {
	base = sanitizeNickname(base)
	if base == "" {
		base = "user"
	}
	candidate := base
	for attempt := 0; attempt < 20; attempt++ {
		if _, err := s.q.GetUserByNickname(ctx, candidate); err != nil {
			return candidate, nil
		}
		candidate = fmt.Sprintf("%s_%s", base, randomSuffix(4))
	}
	return "", fmt.Errorf("could not allocate nickname")
}

// --- helpers ---

func nicknameFromEmail(email string) string {
	at := strings.Index(email, "@")
	if at <= 0 {
		return "user"
	}
	return email[:at]
}

func sanitizeNickname(input string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(input) {
		switch {
		case unicode.IsLetter(r) && r < 128:
			b.WriteRune(r)
		case unicode.IsDigit(r):
			b.WriteRune(r)
		case r == '_' || r == '-' || r == '.':
			b.WriteRune(r)
		}
	}
	out := b.String()
	if len(out) > 50 {
		out = out[:50]
	}
	if out == "" {
		out = "user"
	}
	return out
}

func generateNumericCode(n int) string {
	const digits = "0123456789"
	b := make([]byte, n)
	for i := range b {
		idx, _ := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		b[i] = digits[idx.Int64()]
	}
	return string(b)
}

func generateToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func randomSuffix(n int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		idx, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		b[i] = charset[idx.Int64()]
	}
	return string(b)
}

// deliverCodeToInbox simulates email delivery by printing a clearly-visible block to stdout.
// Visible via `docker compose logs api` or `make logs`.
func deliverCodeToInbox(email, code string) {
	log.Printf(
		"\n========== VERIFICATION EMAIL ==========\n"+
			" To:       %s\n"+
			" Subject:  Подтверждение email\n"+
			" Code:     %s\n"+
			" Expires:  %s\n"+
			"========================================",
		email, code, time.Now().Add(codeTTL).Format(time.RFC3339))
}
