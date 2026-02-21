// Типы данных
export interface QuizAnswer {
  id: number;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: number;
  question: string;
  answers: QuizAnswer[];
}

export interface QuizSettings {
  name: string;
  difficulty: string;
  questionsCount: number;
  timePerQuestion: number;
  isPublic: boolean;
}

export interface Quiz {
  code: string;
  settings: QuizSettings;
  questions: QuizQuestion[];
  createdAt: string;
}

export interface Player {
  id: string;
  name: string;
  isReady: boolean;
  score: number;
}

export interface Room {
  code: string;
  quizCode: string;
  hostId: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  currentQuestion: number;
}

// Функции для работы с localStorage
const STORAGE_KEYS = {
  QUIZZES: 'vk_quiz_quizzes',
  ROOMS: 'vk_quiz_rooms',
  CURRENT_PLAYER: 'vk_quiz_current_player',
};

// === КВИЗЫ ===
export const saveQuiz = (quiz: Quiz): void => {
  const quizzes = getQuizzes();
  const existingIndex = quizzes.findIndex(q => q.code === quiz.code);
  
  if (existingIndex >= 0) {
    quizzes[existingIndex] = quiz;
  } else {
    quizzes.push(quiz);
  }
  
  localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(quizzes));
};

export const getQuizzes = (): Quiz[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.QUIZZES);
  return data ? JSON.parse(data) : [];
};

export const getQuizByCode = (code: string): Quiz | null => {
  const quizzes = getQuizzes();
  return quizzes.find(q => q.code === code) || null;
};

export const deleteQuiz = (code: string): void => {
  const quizzes = getQuizzes().filter(q => q.code !== code);
  localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(quizzes));
};

// === КОМНАТЫ ===
export const saveRoom = (room: Room): void => {
  const rooms = getRooms();
  const existingIndex = rooms.findIndex(r => r.code === room.code);
  
  if (existingIndex >= 0) {
    rooms[existingIndex] = room;
  } else {
    rooms.push(room);
  }
  
  localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
};

export const getRooms = (): Room[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.ROOMS);
  return data ? JSON.parse(data) : [];
};

export const getRoomByCode = (code: string): Room | null => {
  const rooms = getRooms();
  return rooms.find(r => r.code === code) || null;
};

export const deleteRoom = (code: string): void => {
  const rooms = getRooms().filter(r => r.code !== code);
  localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
};

// === ТЕКУЩИЙ ИГРОК ===
export const saveCurrentPlayer = (player: Player): void => {
  localStorage.setItem(STORAGE_KEYS.CURRENT_PLAYER, JSON.stringify(player));
};

export const getCurrentPlayer = (): Player | null => {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_PLAYER);
  return data ? JSON.parse(data) : null;
};

// === УТИЛИТЫ ===
export const generateRoomCode = (): string => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

export const formatRoomCode = (code: string): string => {
  return code.replace(/^(.{4})(.{4})$/, "$1-$2");
};

export const createDefaultPlayer = (name: string = "Игрок"): Player => {
  return {
    id: Math.random().toString(36).substring(7),
    name,
    isReady: false,
    score: 0,
  };
};

// === УТИЛИТЫ ДЛЯ ОТЛАДКИ ===
// Вызовите в консоли браузера: window.VKQuizDebug.showAll()
if (typeof window !== 'undefined') {
  (window as any).VKQuizDebug = {
    showAll: () => {
      console.log('=== VK Quiz Storage ===');
      console.log('Quizzes:', getQuizzes());
      console.log('Rooms:', getRooms());
      console.log('Last Result:', localStorage.getItem('vk_quiz_last_result'));
    },
    clearAll: () => {
      localStorage.removeItem(STORAGE_KEYS.QUIZZES);
      localStorage.removeItem(STORAGE_KEYS.ROOMS);
      localStorage.removeItem('vk_quiz_last_result');
      console.log('✅ Storage cleared!');
    },
  };
}
