import type { SessionUser } from '@/lib/types';

const STORAGE_KEY = 'comercial_os_session_user';

export function getSessionUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setSessionUser(user: SessionUser) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearSessionUser() {
  localStorage.removeItem(STORAGE_KEY);
}
