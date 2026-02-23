// ─── Source Types ────────────────────────────────────────────────────────────

export interface SourceInfo {
  id: string;
  title: string;
  sourceType: 'file' | 'note' | 'scan' | string;
  dataType: '1' | '2' | '3' | string;
  fileType: string;
  url: string;
  createdAt: string;
  status?: 'pending' | 'processing' | 'success' | 'failed';
}

// ─── Model Types ──────────────────────────────────────────────────────────────

export type ModelId = 'briefing' | 'evidence-based' | 'heavy-duty';

// ─── AI Response Types ────────────────────────────────────────────────────────

export interface AISource {
  id: number;
  title: string;
  date: string;
  type: string;
}

export interface EvaluationMetrics {
  score: number;
  is_helpful: boolean;
  is_grounded: boolean;
  hallucination_detected: boolean;
  reason: string;
  suggestion: string;
}

export interface AIResponse {
  answer: string;
  sources: AISource[];
  confidence: string;
  evaluation_metrics: EvaluationMetrics;
}

// ─── Chat Types ───────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  aiResponse?: AIResponse; // structured response for AI messages
}

// ─── Todo Types ───────────────────────────────────────────────────────────────

export interface TodoItem {
  id: string;           // e.g. "001-1"
  label: string;        // heading text
  description?: string; // first bullet under heading
  done: boolean;
}

export interface TodoChecklist {
  caseId: string;
  title?: string;
  items: TodoItem[];
  updatedAt: string;
}

export interface ChecklistAnalytic {
  analytic_type: 'checklist';
  client_case_id: string;
  report: string;
  sources?: Array<{ id: number; title: string; date: string; type: string }>;
}

// ─── Client Types ─────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  img: string;
}

// ─── Chat History ─────────────────────────────────────────────────────────────

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

// ─── Component Prop Types ─────────────────────────────────────────────────────

export interface ChatAreaProps {
  activeSource?: string | SourceInfo | null;
  onClearSource?: () => void;
  onSourceSelect?: (source: SourceInfo) => void;
  onSaveChat?: (messages: Message[]) => void;
  sessionKey?: string;
  initialMessages?: Message[];
  leftOpen?: boolean;
  rightOpen?: boolean;
  onToggleLeft?: () => void;
  onToggleRight?: () => void;
  userName?: string;
  caseId?: number | null;
  analyticsContent?: string | null;
  analyticsLoading?: boolean;
}

export interface SidebarLeftProps {
  onToggle: () => void;
  onSourceSelect: (source: SourceInfo) => void;
  onLoadSession: (session: ChatSession) => void;
  caseId?: number | null;
}

export interface SidebarRightProps {
  markdownContent: string;
  onSourceClick: (heading: string) => void;
  onToggle: () => void;
  checklistData?: ChecklistAnalytic | null;
  analyticsLoading?: Record<string, boolean>;
}

export interface HeaderProps {
  cases: Array<{ case_id: number; client_id: number; client_name: string; description: string | null; file_count: number }>;
  selectedCaseId: number | null;
  onCaseChange: (caseId: number) => void;
  isLoading?: boolean;
  clients: Array<{ client_id: number; client_name: string; case_count: number }>;
  selectedClientId: number | null;
  onClientChange: (clientId: number) => void;
  onCreateClient: (name: string) => void;
  onCreateCase?: (clientId: number, description: string) => void;
  clientsLoading?: boolean;
}

export interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSourceAdded: (source: SourceInfo) => void;
  caseId?: number | null;
}
