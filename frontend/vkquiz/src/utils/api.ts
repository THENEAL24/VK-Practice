const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8050";

const TOKEN_KEY = "vk_quiz_token";

export function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export interface ApiErrorBody {
  error?: string;
  requiresVerification?: boolean;
  userId?: string;
  email?: string;
}

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;
  constructor(message: string, status: number, body: ApiErrorBody) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body: ApiErrorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || `HTTP ${res.status}`, res.status, body);
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
  authorUserId?: string;
  authorNickname?: string;
}

export interface QuizSummary {
  code: string;
  name: string;
  difficulty: string;
  questionsCount: number;
  timePerQuestion: number;
  isPublic: boolean;
  authorUserId?: string;
  authorNickname?: string;
  createdAt: string;
}

export interface PlayerDTO {
  id: string;
  name: string;
  isReady: boolean;
  score: number;
  userId?: string;
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
  room?: RoomResponse | null;
}

export interface AnswerCheckResponse {
  correct: boolean;
  correctIds: number[];
  scoreEarned: number;
  totalScore: number;
}

export interface GameResultResponse {
  code: string;
  playerId: string;
  playerName: string;
  userId?: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  quizName: string;
  quizCode?: string;
  finishedAt: string;
}

export interface LeaderboardResponse {
  code: string;
  quizName: string;
  entries: GameResultResponse[];
}

export interface UserResponse {
  id: string;
  name: string;
  nickname: string;
  email?: string;
  vkId?: string;
  isVerified: boolean;
  hasEmail: boolean;
  createdAt: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
}

export interface AuthResponse {
  token?: string;
  user: UserResponse;
  requiresVerification?: boolean;
  userId?: string;
  email?: string;
}

// --- Quiz API ---

export function createQuiz(
  settings: QuizSettingsDTO,
  questions: QuestionDTO[],
  userId?: string
): Promise<CreateQuizResponse> {
  return request("/api/quizzes", {
    method: "POST",
    body: JSON.stringify({ settings, questions, userId }),
  });
}

export function getQuiz(code: string): Promise<QuizResponse> {
  return request(`/api/quizzes/${code}`);
}

export function listQuizzes(params?: { authorId?: string; limit?: number; offset?: number }): Promise<QuizSummary[]> {
  const search = new URLSearchParams();
  if (params?.authorId) search.set("authorId", params.authorId);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.offset) search.set("offset", String(params.offset));
  const qs = search.toString();
  return request(`/api/quizzes${qs ? `?${qs}` : ""}`);
}

export function launchQuiz(code: string, userId?: string): Promise<CreateQuizResponse> {
  return request(`/api/quizzes/${code}/launch`, {
    method: "POST",
    body: JSON.stringify({ userId: userId ?? "" }),
  });
}

// --- Room API ---

export function getRoom(code: string): Promise<RoomResponse> {
  return request(`/api/rooms/${code}`);
}

export function joinRoom(
  code: string,
  playerName: string,
  userId?: string
): Promise<RoomResponse> {
  return request(`/api/rooms/${code}/join`, {
    method: "POST",
    body: JSON.stringify({ playerName, userId: userId ?? "" }),
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

// --- Game API ---

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
  totalQuestions: number,
  userId?: string
): Promise<GameResultResponse> {
  return request(`/api/games/${code}/results`, {
    method: "POST",
    body: JSON.stringify({ playerId, score, correctAnswers, totalQuestions, userId: userId ?? "" }),
  });
}

export function getLeaderboard(code: string): Promise<LeaderboardResponse> {
  return request(`/api/games/${code}/results`);
}

// --- User API ---

export function createUser(name: string, nickname: string): Promise<UserResponse> {
  return request(`/api/users`, {
    method: "POST",
    body: JSON.stringify({ name, nickname }),
  });
}

export function getUser(id: string): Promise<UserResponse> {
  return request(`/api/users/${id}`);
}

export function updateUser(id: string, name: string, nickname: string): Promise<UserResponse> {
  return request(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name, nickname }),
  });
}

export function getUserHistory(id: string, limit = 50): Promise<GameResultResponse[]> {
  return request(`/api/users/${id}/history?limit=${limit}`);
}

// --- Auth API ---

export function registerAccount(payload: {
  name: string;
  nickname?: string;
  email: string;
  password: string;
}): Promise<RegisterResponse> {
  return request(`/api/auth/register`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyEmail(userId: string, code: string): Promise<AuthResponse> {
  return request(`/api/auth/verify`, {
    method: "POST",
    body: JSON.stringify({ userId, code }),
  });
}

export function resendCode(email: string): Promise<RegisterResponse> {
  return request(`/api/auth/resend`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function loginAccount(email: string, password: string): Promise<AuthResponse> {
  return request(`/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout(): Promise<void> {
  return request(`/api/auth/logout`, { method: "POST" });
}

export function getMe(): Promise<UserResponse> {
  return request(`/api/auth/me`);
}
