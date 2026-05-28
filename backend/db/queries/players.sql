-- name: CreatePlayer :one
INSERT INTO players (room_id, user_id, name, is_ready, score)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetPlayersByRoomID :many
SELECT * FROM players WHERE room_id = $1;

-- name: GetPlayerByID :one
SELECT * FROM players WHERE id = $1;

-- name: GetPlayerByRoomAndUser :one
SELECT * FROM players WHERE room_id = $1 AND user_id = $2;

-- name: UpdatePlayerReady :one
UPDATE players SET is_ready = $2 WHERE id = $1
RETURNING *;

-- name: UpdatePlayerScore :one
UPDATE players SET score = $2 WHERE id = $1
RETURNING *;

-- name: UpdatePlayerName :one
UPDATE players SET name = $2 WHERE id = $1
RETURNING *;

-- name: DeletePlayer :exec
DELETE FROM players WHERE id = $1;
