package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"

	"github.com/THENEAL24/VK-Practice/backend/db/sqlc"
	"github.com/THENEAL24/VK-Practice/backend/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type QuizService struct {
	pool *pgxpool.Pool
	q    *sqlc.Queries
}

func NewQuizService(pool *pgxpool.Pool) *QuizService {
	return &QuizService{
		pool: pool,
		q:    sqlc.New(pool),
	}
}

// CreateQuiz persists a quiz with its questions/answers. It does NOT create a room.
// Use LaunchQuiz to spawn a room when the host is ready to play.
func (s *QuizService) CreateQuiz(ctx context.Context, req model.CreateQuizRequest) (*model.CreateQuizResponse, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := s.q.WithTx(tx)
	code := generateCode()
	authorUUID := optionalUUID(req.UserID)

	quiz, err := qtx.CreateQuiz(ctx, sqlc.CreateQuizParams{
		Code:            code,
		Name:            req.Settings.Name,
		Difficulty:      req.Settings.Difficulty,
		QuestionsCount:  int32(req.Settings.QuestionsCount),
		TimePerQuestion: int32(req.Settings.TimePerQuestion),
		IsPublic:        req.Settings.IsPublic,
		AuthorUserID:    authorUUID,
	})
	if err != nil {
		return nil, fmt.Errorf("create quiz: %w", err)
	}

	var questions []model.QuestionDTO
	for i, qDTO := range req.Questions {
		question, err := qtx.CreateQuestion(ctx, sqlc.CreateQuestionParams{
			QuizID:    quiz.ID,
			SortOrder: int32(i),
			Text:      qDTO.Question,
		})
		if err != nil {
			return nil, fmt.Errorf("create question %d: %w", i, err)
		}

		var answers []model.AnswerDTO
		for j, aDTO := range qDTO.Answers {
			answer, err := qtx.CreateAnswer(ctx, sqlc.CreateAnswerParams{
				QuestionID: question.ID,
				SortOrder:  int32(j),
				Text:       aDTO.Text,
				IsCorrect:  aDTO.IsCorrect,
			})
			if err != nil {
				return nil, fmt.Errorf("create answer %d/%d: %w", i, j, err)
			}
			answers = append(answers, model.AnswerDTO{
				ID:        j,
				Text:      answer.Text,
				IsCorrect: answer.IsCorrect,
			})
		}
		questions = append(questions, model.QuestionDTO{
			ID:       i,
			Question: question.Text,
			Answers:  answers,
		})
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}

	authorNickname := ""
	if authorUUID.Valid {
		if u, err := s.q.GetUserByID(ctx, authorUUID); err == nil {
			authorNickname = u.Nickname
		}
	}

	return &model.CreateQuizResponse{
		Quiz: model.QuizResponse{
			Code: code,
			Settings: model.QuizSettingsDTO{
				Name:            quiz.Name,
				Difficulty:      quiz.Difficulty,
				QuestionsCount:  int(quiz.QuestionsCount),
				TimePerQuestion: int(quiz.TimePerQuestion),
				IsPublic:        quiz.IsPublic,
			},
			Questions:      questions,
			CreatedAt:      quiz.CreatedAt.Time,
			AuthorUserID:   uuidToString(quiz.AuthorUserID),
			AuthorNickname: authorNickname,
		},
		Room: nil,
	}, nil
}

func (s *QuizService) GetQuizByCode(ctx context.Context, code string) (*model.QuizResponse, error) {
	quiz, err := s.q.GetQuizByCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("get quiz: %w", err)
	}
	return s.buildQuizResponse(ctx, quiz)
}

func (s *QuizService) buildQuizResponse(ctx context.Context, quiz sqlc.Quiz) (*model.QuizResponse, error) {
	questions, err := s.q.GetQuestionsByQuizID(ctx, quiz.ID)
	if err != nil {
		return nil, fmt.Errorf("get questions: %w", err)
	}

	questionIDs := make([]pgtype.UUID, len(questions))
	for i, q := range questions {
		questionIDs[i] = q.ID
	}

	answers, err := s.q.GetAnswersByQuestionIDs(ctx, questionIDs)
	if err != nil {
		return nil, fmt.Errorf("get answers: %w", err)
	}

	answerMap := make(map[string][]sqlc.Answer)
	for _, a := range answers {
		key := uuidToString(a.QuestionID)
		answerMap[key] = append(answerMap[key], a)
	}

	var questionDTOs []model.QuestionDTO
	for i, q := range questions {
		key := uuidToString(q.ID)
		qAnswers := answerMap[key]
		var answerDTOs []model.AnswerDTO
		for j, a := range qAnswers {
			answerDTOs = append(answerDTOs, model.AnswerDTO{
				ID:        j,
				Text:      a.Text,
				IsCorrect: a.IsCorrect,
			})
		}
		questionDTOs = append(questionDTOs, model.QuestionDTO{
			ID:       i,
			Question: q.Text,
			Answers:  answerDTOs,
		})
	}

	authorNickname := ""
	if quiz.AuthorUserID.Valid {
		if u, err := s.q.GetUserByID(ctx, quiz.AuthorUserID); err == nil {
			authorNickname = u.Nickname
		}
	}

	return &model.QuizResponse{
		Code: quiz.Code,
		Settings: model.QuizSettingsDTO{
			Name:            quiz.Name,
			Difficulty:      quiz.Difficulty,
			QuestionsCount:  int(quiz.QuestionsCount),
			TimePerQuestion: int(quiz.TimePerQuestion),
			IsPublic:        quiz.IsPublic,
		},
		Questions:      questionDTOs,
		CreatedAt:      quiz.CreatedAt.Time,
		AuthorUserID:   uuidToString(quiz.AuthorUserID),
		AuthorNickname: authorNickname,
	}, nil
}

func (s *QuizService) ListPublicQuizzes(ctx context.Context, limit, offset int32) ([]model.QuizSummaryDTO, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	quizzes, err := s.q.ListPublicQuizzes(ctx, sqlc.ListPublicQuizzesParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, fmt.Errorf("list quizzes: %w", err)
	}
	return s.toSummaries(ctx, quizzes), nil
}

func (s *QuizService) ListQuizzesByAuthor(ctx context.Context, userID string) ([]model.QuizSummaryDTO, error) {
	uid := stringToUUID(userID)
	if !uid.Valid {
		return nil, fmt.Errorf("invalid user id")
	}
	quizzes, err := s.q.ListQuizzesByAuthor(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("list by author: %w", err)
	}
	return s.toSummaries(ctx, quizzes), nil
}

func (s *QuizService) toSummaries(ctx context.Context, quizzes []sqlc.Quiz) []model.QuizSummaryDTO {
	authorCache := make(map[string]string)
	out := make([]model.QuizSummaryDTO, 0, len(quizzes))
	for _, q := range quizzes {
		nickname := ""
		if q.AuthorUserID.Valid {
			authID := uuidToString(q.AuthorUserID)
			if n, ok := authorCache[authID]; ok {
				nickname = n
			} else if u, err := s.q.GetUserByID(ctx, q.AuthorUserID); err == nil {
				nickname = u.Nickname
				authorCache[authID] = nickname
			}
		}
		out = append(out, model.QuizSummaryDTO{
			Code:            q.Code,
			Name:            q.Name,
			Difficulty:      q.Difficulty,
			QuestionsCount:  int(q.QuestionsCount),
			TimePerQuestion: int(q.TimePerQuestion),
			IsPublic:        q.IsPublic,
			AuthorUserID:    uuidToString(q.AuthorUserID),
			AuthorNickname:  nickname,
			CreatedAt:       q.CreatedAt.Time,
		})
	}
	return out
}

// LaunchQuiz creates a new room for an existing quiz and returns it.
func (s *QuizService) LaunchQuiz(ctx context.Context, quizCode string, req model.LaunchQuizRequest) (*model.CreateQuizResponse, error) {
	quiz, err := s.q.GetQuizByCode(ctx, quizCode)
	if err != nil {
		return nil, fmt.Errorf("get quiz: %w", err)
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := s.q.WithTx(tx)
	roomCode := generateCode()

	hostUUID := optionalUUID(req.UserID)
	hostName := "Вы (Хост)"
	if hostUUID.Valid {
		if u, err := qtx.GetUserByID(ctx, hostUUID); err == nil {
			hostName = u.Name
		}
	}

	room, err := qtx.CreateRoom(ctx, sqlc.CreateRoomParams{
		Code:   roomCode,
		QuizID: quiz.ID,
		Status: "waiting",
	})
	if err != nil {
		return nil, fmt.Errorf("create room: %w", err)
	}

	hostPlayer, err := qtx.CreatePlayer(ctx, sqlc.CreatePlayerParams{
		RoomID:  room.ID,
		UserID:  hostUUID,
		Name:    hostName,
		IsReady: false,
		Score:   0,
	})
	if err != nil {
		return nil, fmt.Errorf("create host player: %w", err)
	}

	if err := qtx.SetRoomHost(ctx, sqlc.SetRoomHostParams{
		ID:           room.ID,
		HostPlayerID: hostPlayer.ID,
	}); err != nil {
		return nil, fmt.Errorf("set host: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}

	quizResp, err := s.buildQuizResponse(ctx, quiz)
	if err != nil {
		return nil, err
	}

	return &model.CreateQuizResponse{
		Quiz: *quizResp,
		Room: &model.RoomResponse{
			Code:     room.Code,
			QuizCode: quiz.Code,
			HostID:   uuidToString(hostPlayer.ID),
			Players: []model.PlayerDTO{
				{
					ID:      uuidToString(hostPlayer.ID),
					Name:    hostPlayer.Name,
					IsReady: hostPlayer.IsReady,
					Score:   int(hostPlayer.Score),
					UserID:  uuidToString(hostPlayer.UserID),
				},
			},
			Status:          "waiting",
			CurrentQuestion: 0,
		},
	}, nil
}

func (s *QuizService) DeleteQuiz(ctx context.Context, code string) error {
	quiz, err := s.q.GetQuizByCode(ctx, code)
	if err != nil {
		return fmt.Errorf("get quiz: %w", err)
	}
	return s.q.DeleteQuiz(ctx, quiz.ID)
}

// IsNotFound checks if the error indicates a "not found" result from pgx.
func IsNotFound(err error) bool {
	return err == pgx.ErrNoRows
}

func generateCode() string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 8)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		b[i] = charset[n.Int64()]
	}
	return string(b)
}

func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	return fmt.Sprintf("%x-%x-%x-%x-%x", u.Bytes[0:4], u.Bytes[4:6], u.Bytes[6:8], u.Bytes[8:10], u.Bytes[10:16])
}

func stringToUUID(s string) pgtype.UUID {
	var u pgtype.UUID
	parsed, err := parseUUID(s)
	if err != nil {
		return u
	}
	u.Bytes = parsed
	u.Valid = true
	return u
}

// optionalUUID returns a valid UUID or an invalid one (NULL) if input is empty/invalid.
func optionalUUID(s string) pgtype.UUID {
	if s == "" {
		return pgtype.UUID{}
	}
	return stringToUUID(s)
}

func parseUUID(s string) ([16]byte, error) {
	var uuid [16]byte
	clean := ""
	for _, c := range s {
		if c != '-' {
			clean += string(c)
		}
	}
	if len(clean) != 32 {
		return uuid, fmt.Errorf("invalid uuid: %s", s)
	}
	for i := 0; i < 16; i++ {
		var b byte
		for j := 0; j < 2; j++ {
			c := clean[i*2+j]
			switch {
			case c >= '0' && c <= '9':
				b = b*16 + (c - '0')
			case c >= 'a' && c <= 'f':
				b = b*16 + (c - 'a' + 10)
			case c >= 'A' && c <= 'F':
				b = b*16 + (c - 'A' + 10)
			default:
				return uuid, fmt.Errorf("invalid hex char: %c", c)
			}
		}
		uuid[i] = b
	}
	return uuid, nil
}
