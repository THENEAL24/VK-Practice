-- name: CreatePlayer :one
INSERT INTO players (room_id, name, is_ready, score)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetPlayersByRoomID :many
SELECT * FROM players WHERE room_id = $1;

-- name: GetPlayerByID :one
SELECT * FROM players WHERE id = $1;

-- name: UpdatePlayerReady :one
UPDATE players SET is_ready = $2 WHERE id = $1
RETURNING *;

-- name: UpdatePlayerScore :one
UPDATE players SET score = $2 WHERE id = $1
RETURNING *;

-- name: DeletePlayer :exec
DELETE FROM players WHERE id = $1;
