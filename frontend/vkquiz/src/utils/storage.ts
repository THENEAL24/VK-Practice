import {
  createUser as apiCreateUser,
  getUser as apiGetUser,
  updateUser as apiUpdateUser,
  getMe,
  setAuthToken,
  getAuthToken,
  logout as apiLogout,
  ApiError,
  UserResponse,
} from "./api";

const STORAGE_KEYS = {
  PROFILE: "vk_quiz_profile",
  PLAYER_ID: "vk_quiz_player_id",
  LAST_RESULT: "vk_quiz_last_result",
} as const;

export interface LocalProfile {
  id: string;
  name: string;
  nickname: string;
  email?: string;
  isAuthenticated: boolean;
}

function fromRemote(user: UserResponse, isAuthenticated: boolean): LocalProfile {
  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    email: user.email,
    isAuthenticated,
  };
}

export function getProfile(): LocalProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalProfile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: LocalProfile): void {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
}

export function clearProfile(): void {
  localStorage.removeItem(STORAGE_KEYS.PROFILE);
}

function randomNickSuffix(): string {
  return Math.random().toString(36).slice(2, 7);
}

function generateGuestProfile(): { name: string; nickname: string } {
  return {
    name: "Игрок",
    nickname: `player_${randomNickSuffix()}`,
  };
}

/**
 * Ensures we have *some* identity: either an authenticated user (from session token),
 * or a lightweight guest profile (legacy fallback).
 */
export async function ensureProfile(): Promise<LocalProfile> {
  const token = getAuthToken();
  if (token) {
    try {
      const me = await getMe();
      const p = fromRemote(me, true);
      saveProfile(p);
      return p;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
        setAuthToken("");
        clearProfile();
      } else {
        // Network issue — fall back to whatever we have locally
        const local = getProfile();
        if (local) return local;
      }
    }
  }

  const local = getProfile();
  if (local && !local.isAuthenticated) {
    try {
      const remote = await apiGetUser(local.id);
      const merged = fromRemote(remote, false);
      saveProfile(merged);
      return merged;
    } catch {
      clearProfile();
    }
  }

  const guest = generateGuestProfile();
  let created: UserResponse | null = null;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    try {
      created = await apiCreateUser(
        guest.name,
        attempt === 0 ? guest.nickname : `${guest.nickname}_${attempt}`
      );
    } catch {
      guest.nickname = `player_${randomNickSuffix()}`;
    }
  }
  if (!created) throw new Error("Не удалось создать профиль");

  const profile = fromRemote(created, false);
  saveProfile(profile);
  return profile;
}

export async function updateProfile(name: string, nickname: string): Promise<LocalProfile> {
  const local = getProfile();
  if (!local) throw new Error("Профиль не найден");
  const updated = await apiUpdateUser(local.id, name, nickname);
  const next = fromRemote(updated, local.isAuthenticated);
  saveProfile(next);
  return next;
}

/** Persists a freshly-obtained session: token + user. Replaces any previous (guest) profile. */
export function applySession(token: string, user: UserResponse): LocalProfile {
  setAuthToken(token);
  const profile = fromRemote(user, true);
  saveProfile(profile);
  return profile;
}

export async function signOut(): Promise<void> {
  try {
    await apiLogout();
  } catch {
    // ignore
  }
  setAuthToken("");
  clearProfile();
}

export const PLAYER_ID_KEY = STORAGE_KEYS.PLAYER_ID;
export const LAST_RESULT_KEY = STORAGE_KEYS.LAST_RESULT;

export function getPlayerId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEYS.PLAYER_ID) || "";
}

export function savePlayerId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.PLAYER_ID, id);
}

export function formatRoomCode(code: string): string {
  return code.replace(/^(.{4})(.{4})$/, "$1-$2");
}
