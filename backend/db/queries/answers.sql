-- name: CreateAnswer :one
INSERT INTO answers (question_id, sort_order, text, is_correct)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetAnswersByQuestionID :many
SELECT * FROM answers WHERE question_id = $1 ORDER BY sort_order;

-- name: GetAnswersByQuestionIDs :many
SELECT * FROM answers WHERE question_id = ANY($1::uuid[]) ORDER BY question_id, sort_order;
