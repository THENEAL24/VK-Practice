ALTER TABLE game_results
    DROP COLUMN IF EXISTS quiz_name,
    DROP COLUMN IF EXISTS player_name,
    DROP COLUMN IF EXISTS quiz_id,
    DROP COLUMN IF EXISTS user_id;

ALTER TABLE players DROP COLUMN IF EXISTS user_id;
ALTER TABLE quizzes DROP COLUMN IF EXISTS author_user_id;

DROP TABLE IF EXISTS users;
