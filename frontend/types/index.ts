// ─── Source Types ────────────────────────────────────────────────────────────

export interface SourceInfo {
  id: string;
  title: string;
  sourceType: 'file' | 'note' | 'scan' | string;
  dataType: '1' | '2' | '3' | string;
  fileType: string;
  url: string;
  createdAt: string;
}

// ─── Chat Types ───────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ─── Client Types ─────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  img: string;
}

// ─── Component Prop Types ─────────────────────────────────────────────────────

export interface ChatAreaProps {
  activeSource?: string | SourceInfo | null;
  onClearSource?: () => void;
  leftOpen?: boolean;
  rightOpen?: boolean;
  onToggleLeft?: () => void;
  onToggleRight?: () => void;
  userName?: string;
}

export interface SidebarLeftProps {
  onToggle: () => void;
  onSourceSelect: (source: SourceInfo) => void;
}

export interface SidebarRightProps {
  markdownContent: string;
  onSourceClick: (heading: string) => void;
  onToggle: () => void;
}

export interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSourceAdded: (source: SourceInfo) => void;
}
