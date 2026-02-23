/**
 * Centralized API client for backend communication.
 * All calls go through Next.js rewrites: /api/backend/* → http://localhost:8000/api/*
 */

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function fetchClients(): Promise<BackendClient[]> {
  try {
    const res = await fetch(`${API}/clients`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createClient(data: { client_name: string; phone?: string; address?: string }): Promise<BackendClient> {
  const res = await fetch(`${API}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create client');
  return res.json();
}

// ─── Cases ────────────────────────────────────────────────────────────────────

export async function fetchAllCases(): Promise<AllCaseItem[]> {
  try {
    const res = await fetch(`${API}/all-cases`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    // Backend not running or unreachable — return empty list gracefully
    return [];
  }
}

export async function fetchCasesForClient(clientId: number) {
  const res = await fetch(`${API}/clients/${clientId}/cases`);
  if (!res.ok) throw new Error('Failed to fetch cases');
  return res.json();
}

export async function createCase(clientId: number, description?: string) {
  const res = await fetch(`${API}/clients/${clientId}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, description }),
  });
  if (!res.ok) throw new Error('Failed to create case');
  return res.json();
}

// ─── Case Files (Sources) ─────────────────────────────────────────────────────

export async function fetchCaseFiles(caseId: number): Promise<BackendCaseFile[]> {
  const res = await fetch(`${API}/cases-new/${caseId}/files`);
  if (!res.ok) throw new Error('Failed to fetch case files');
  return res.json();
}

export async function uploadCaseFile(caseId: number, file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_type', 'case_file');
  formData.append('case_id', caseId.toString());

  const res = await fetch(`${API}/upload-file`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export function getCaseFileDownloadUrl(fileId: number): string {
  return `${API}/case-files/${fileId}/download`;
}

// ─── RAG Query ────────────────────────────────────────────────────────────────

export async function queryRAG(query: string, databases?: string[], caseId?: number) {
  const res = await fetch(`${API}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      databases: databases || ['law_reference_db', 'case_history_db', 'client_cases_db'],
      case_id: caseId,
    }),
  });
  if (!res.ok) throw new Error('Query failed');
  return res.json();
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function fetchAnalytics(caseId: number, analyticType: string) {
  const res = await fetch(`${API}/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_case_id: caseId.toString(),
      analytic_type: analyticType,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Analytics failed');
  }
  return res.json();
}

export async function clearAnalyticsCache(caseId: number) {
  const res = await fetch(`${API}/analytics-cache/${caseId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear cache');
  return res.json();
}

// ─── Chat Sessions ────────────────────────────────────────────────────────────

export async function fetchChatSessions(caseId?: number) {
  const url = caseId != null ? `${API}/chat-sessions?case_id=${caseId}` : `${API}/chat-sessions`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch chat sessions');
  return res.json();
}

export async function fetchChatSession(sessionId: number) {
  const res = await fetch(`${API}/chat-sessions/${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch chat session');
  return res.json();
}

export async function createChatSession(data: {
  case_id?: number;
  title?: string;
  messages: Array<{ role: string; content: string; ai_response_json?: string | null }>;
}) {
  const res = await fetch(`${API}/chat-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create chat session');
  return res.json();
}

export async function updateChatSession(sessionId: number, data: {
  title?: string;
  messages: Array<{ role: string; content: string; ai_response_json?: string | null }>;
}) {
  const res = await fetch(`${API}/chat-sessions/${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update chat session');
  return res.json();
}

export async function deleteChatSessionApi(sessionId: number) {
  const res = await fetch(`${API}/chat-sessions/${sessionId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete chat session');
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BackendClient {
  client_id: number;
  client_name: string;
  phone: string | null;
  address: string | null;
  created_at: string;
  case_count: number;
}

export interface AllCaseItem {
  case_id: number;
  client_id: number;
  client_name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  file_count: number;
}

export interface BackendCaseFile {
  file_id: number;
  case_id: number;
  filename: string;
  extension: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  status: 'pending' | 'processing' | 'success' | 'failed';
  chunk_count: number | null;
  error_message: string | null;
  uploaded_at: string;
  ingested_at: string | null;
}

export interface UploadResult {
  status: 'success' | 'partial' | 'skipped';
  file_type: string;
  file_id?: number;
  filename: string;
  chunks?: number;
  message: string;
}

export interface BackendChatSession {
  id: number;
  case_id: number | null;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface BackendChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  ai_response_json: string | null;
  created_at: string;
}

export interface BackendChatSessionFull {
  id: number;
  case_id: number | null;
  title: string;
  created_at: string;
  updated_at: string;
  messages: BackendChatMessage[];
}
