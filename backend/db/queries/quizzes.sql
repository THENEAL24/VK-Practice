-- name: CreateQuiz :one
INSERT INTO quizzes (code, name, difficulty, questions_count, time_per_question, is_public)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetQuizByCode :one
SELECT * FROM quizzes WHERE code = $1;

-- name: GetQuizByID :one
SELECT * FROM quizzes WHERE id = $1;

-- name: ListPublicQuizzes :many
SELECT * FROM quizzes WHERE is_public = true ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: DeleteQuiz :exec
DELETE FROM quizzes WHERE id = $1;
