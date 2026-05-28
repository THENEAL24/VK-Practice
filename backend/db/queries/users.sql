-- name: CreateUser :one
INSERT INTO users (name, nickname, email, password_hash, vk_id, is_verified, verified_at)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByNickname :one
SELECT * FROM users WHERE nickname = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserByVKID :one
SELECT * FROM users WHERE vk_id = $1;

-- name: UpdateUser :one
UPDATE users SET name = $2, nickname = $3 WHERE id = $1
RETURNING *;

-- name: MarkUserVerified :one
UPDATE users SET is_verified = true, verified_at = now() WHERE id = $1
RETURNING *;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;
