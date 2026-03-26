const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8050";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Types matching backend DTOs ---

export interface QuizSettingsDTO {
  name: string;
  difficulty: string;
  questionsCount: number;
  timePerQuestion: number;
  isPublic: boolean;
}

export interface AnswerDTO {
  id: number;
  text: string;
  isCorrect: boolean;
}

export interface QuestionDTO {
  id: number;
  question: string;
  answers: AnswerDTO[];
}

export interface QuizResponse {
  code: string;
  settings: QuizSettingsDTO;
  questions: QuestionDTO[];
  createdAt: string;
}

export interface PlayerDTO {
  id: string;
  name: string;
  isReady: boolean;
  score: number;
}

export interface RoomResponse {
  code: string;
  quizCode: string;
  hostId: string;
  players: PlayerDTO[];
  status: "waiting" | "playing" | "finished";
  currentQuestion: number;
}

export interface CreateQuizResponse {
  quiz: QuizResponse;
  room: RoomResponse;
}

export interface AnswerCheckResponse {
  correct: boolean;
  correctIds: number[];
  scoreEarned: number;
  totalScore: number;
}

export interface GameResultResponse {
  code: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  quizName: string;
}

// --- API functions ---

export function createQuiz(
  settings: QuizSettingsDTO,
  questions: QuestionDTO[]
): Promise<CreateQuizResponse> {
  return request("/api/quizzes", {
    method: "POST",
    body: JSON.stringify({ settings, questions }),
  });
}

export function getQuiz(code: string): Promise<QuizResponse> {
  return request(`/api/quizzes/${code}`);
}

export function getRoom(code: string): Promise<RoomResponse> {
  return request(`/api/rooms/${code}`);
}

export function joinRoom(
  code: string,
  playerName: string
): Promise<RoomResponse> {
  return request(`/api/rooms/${code}/join`, {
    method: "POST",
    body: JSON.stringify({ playerName }),
  });
}

export function updateReady(
  code: string,
  playerId: string,
  isReady: boolean
): Promise<RoomResponse> {
  return request(`/api/rooms/${code}/ready`, {
    method: "PATCH",
    body: JSON.stringify({ playerId, isReady }),
  });
}

export function startGame(
  code: string,
  playerId: string
): Promise<RoomResponse> {
  return request(`/api/rooms/${code}/start`, {
    method: "POST",
    body: JSON.stringify({ playerId }),
  });
}

export function submitAnswer(
  code: string,
  playerId: string,
  questionIndex: number,
  selectedAnswers: number[]
): Promise<AnswerCheckResponse> {
  return request(`/api/games/${code}/answer`, {
    method: "POST",
    body: JSON.stringify({ playerId, questionIndex, selectedAnswers }),
  });
}

export function saveResult(
  code: string,
  playerId: string,
  score: number,
  correctAnswers: number,
  totalQuestions: number
): Promise<GameResultResponse> {
  return request(`/api/games/${code}/results`, {
    method: "POST",
    body: JSON.stringify({ playerId, score, correctAnswers, totalQuestions }),
  });
}

export function getResults(code: string): Promise<GameResultResponse[]> {
  return request(`/api/games/${code}/results`);
}
