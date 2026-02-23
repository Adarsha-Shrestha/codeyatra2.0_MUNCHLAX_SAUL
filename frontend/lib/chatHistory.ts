import type { ChatSession, Message } from '@/types';

const STORAGE_KEY = 'saul-chat-history';

export function loadAllSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatSession[]) : [];
  } catch {
    return [];
  }
}

export function upsertSession(existingId: string | null, messages: Message[]): ChatSession {
  const sessions = loadAllSessions();
  const now = new Date().toISOString();

  const firstUser = messages.find((m) => m.role === 'user');
  const title = firstUser
    ? firstUser.content.slice(0, 60) + (firstUser.content.length > 60 ? '…' : '')
    : 'Untitled Chat';

  if (existingId) {
    const existing = sessions.find((s) => s.id === existingId);
    if (existing) {
      const updated = sessions.map((s) =>
        s.id === existingId ? { ...s, title, messages, updatedAt: now } : s
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return { ...existing, title, messages, updatedAt: now };
    }
  }

  const session: ChatSession = {
    id: Date.now().toString(),
    title,
    createdAt: now,
    updatedAt: now,
    messages,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([session, ...sessions]));
  return session;
}

export function saveSession(messages: Message[]): ChatSession {
  return upsertSession(null, messages);
}

export function deleteSession(id: string): void {
  const sessions = loadAllSessions().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}
