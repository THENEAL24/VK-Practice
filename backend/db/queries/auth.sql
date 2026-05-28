-- name: CreateVerificationCode :one
INSERT INTO verification_codes (user_id, code, purpose, expires_at)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetLatestVerificationCode :one
SELECT * FROM verification_codes
WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL
ORDER BY created_at DESC
LIMIT 1;

-- name: MarkCodeUsed :exec
UPDATE verification_codes SET used_at = now() WHERE id = $1;

-- name: InvalidatePreviousCodes :exec
UPDATE verification_codes
SET used_at = now()
WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL;

-- name: CreateSession :one
INSERT INTO sessions (token, user_id, expires_at)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetSession :one
SELECT * FROM sessions WHERE token = $1 AND expires_at > now();

-- name: DeleteSession :exec
DELETE FROM sessions WHERE token = $1;

-- name: DeleteExpiredSessions :exec
DELETE FROM sessions WHERE expires_at <= now();
