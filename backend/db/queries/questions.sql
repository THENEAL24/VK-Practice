-- name: CreateQuestion :one
INSERT INTO questions (quiz_id, sort_order, text)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetQuestionsByQuizID :many
SELECT * FROM questions WHERE quiz_id = $1 ORDER BY sort_order;

-- name: DeleteQuestionsByQuizID :exec
DELETE FROM questions WHERE quiz_id = $1;
