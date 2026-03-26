CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE quizzes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(8) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    difficulty      VARCHAR(20) NOT NULL DEFAULT 'medium',
    questions_count INTEGER NOT NULL DEFAULT 10,
    time_per_question INTEGER NOT NULL DEFAULT 30,
    is_public       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE questions (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    text    TEXT NOT NULL
);

CREATE TABLE answers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    text        TEXT NOT NULL,
    is_correct  BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE rooms (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code             VARCHAR(8) UNIQUE NOT NULL,
    quiz_id          UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    host_player_id   UUID,
    status           VARCHAR(20) NOT NULL DEFAULT 'waiting',
    current_question INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE players (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id  UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name     VARCHAR(100) NOT NULL,
    is_ready BOOLEAN NOT NULL DEFAULT false,
    score    INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE rooms
    ADD CONSTRAINT fk_rooms_host_player
    FOREIGN KEY (host_player_id) REFERENCES players(id) ON DELETE SET NULL;

CREATE TABLE game_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    score           INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    finished_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quizzes_code ON quizzes(code);
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX idx_answers_question_id ON answers(question_id);
CREATE INDEX idx_players_room_id ON players(room_id);
CREATE INDEX idx_game_results_room_id ON game_results(room_id);
