'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Trash2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loadAllSessions, deleteSession, formatSessionDate } from '@/lib/chatHistory';
import type { ChatSession } from '@/types';

interface ChatHistoryPanelProps {
  onSelectSession: (session: ChatSession) => void;
  refreshKey?: number; // increment to force re-read from storage
}

export default function ChatHistoryPanel({ onSelectSession, refreshKey }: ChatHistoryPanelProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    setSessions(loadAllSessions());
  }, [refreshKey]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <MessageSquare className="w-10 h-10 text-nblm-border mb-4" />
        <p className="text-[14px] text-zinc-500 font-medium">No saved chats yet</p>
        <p className="text-[12px] text-zinc-600 mt-1">
          Use the ⋯ menu in chat to save a conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-2">
      <AnimatePresence initial={false}>
        {sessions.map((session, i) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8, height: 0, marginBottom: 0 }}
            transition={{ delay: i * 0.03, duration: 0.2 }}
            onClick={() => onSelectSession(session)}
            className="group mx-3 mb-1 px-3 py-2.5 rounded-xl hover:bg-nblm-panel cursor-pointer transition-colors border border-transparent hover:border-nblm-border"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <MessageSquare className="w-3.5 h-3.5 text-nblm-text-muted shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-nblm-text group-hover:text-nblm-text truncate leading-snug transition-colors">
                    {session.title}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5 text-nblm-text-muted" />
                    <span className="text-[11px] text-nblm-text-muted">{formatSessionDate(session.updatedAt)}</span>
                    <span className="text-[11px] text-nblm-text-muted ml-1">
                      · {session.messages.length} msg{session.messages.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(e, session.id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-nblm-border text-nblm-text-muted hover:text-red-400 transition-all"
                title="Delete chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
