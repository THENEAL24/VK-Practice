-- name: CreateRoom :one
INSERT INTO rooms (code, quiz_id, host_player_id, status)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetRoomByCode :one
SELECT * FROM rooms WHERE code = $1;

-- name: GetRoomByID :one
SELECT * FROM rooms WHERE id = $1;

-- name: UpdateRoomStatus :one
UPDATE rooms SET status = $2, current_question = $3 WHERE id = $1
RETURNING *;

-- name: SetRoomHost :exec
UPDATE rooms SET host_player_id = $2 WHERE id = $1;

-- name: DeleteRoom :exec
DELETE FROM rooms WHERE id = $1;
