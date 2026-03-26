-- name: CreateGameResult :one
INSERT INTO game_results (room_id, player_id, score, correct_answers, total_questions)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetGameResultsByRoomID :many
SELECT * FROM game_results WHERE room_id = $1 ORDER BY score DESC;

-- name: GetGameResultByPlayer :one
SELECT * FROM game_results WHERE room_id = $1 AND player_id = $2;
