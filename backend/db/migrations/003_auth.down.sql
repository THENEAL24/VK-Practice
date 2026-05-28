DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS verification_codes;

ALTER TABLE users
    DROP COLUMN IF EXISTS verified_at,
    DROP COLUMN IF EXISTS is_verified,
    DROP COLUMN IF EXISTS vk_id,
    DROP COLUMN IF EXISTS password_hash,
    DROP COLUMN IF EXISTS email;
