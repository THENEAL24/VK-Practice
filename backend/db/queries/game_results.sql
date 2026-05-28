-- name: CreateGameResult :one
INSERT INTO game_results (room_id, player_id, user_id, quiz_id, player_name, quiz_name, score, correct_answers, total_questions)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetGameResultsByRoomID :many
SELECT * FROM game_results WHERE room_id = $1 ORDER BY score DESC, finished_at ASC;

-- name: GetGameResultByPlayer :one
SELECT * FROM game_results WHERE room_id = $1 AND player_id = $2;

-- name: GetGameResultsByUserID :many
SELECT * FROM game_results WHERE user_id = $1 ORDER BY finished_at DESC LIMIT $2;
