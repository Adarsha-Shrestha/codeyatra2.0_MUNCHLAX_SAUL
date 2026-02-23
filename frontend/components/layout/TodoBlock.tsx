'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckSquare, ChevronDown, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { parseChecklistReport, loadDoneState, saveDoneState } from '@/lib/parseTodo';
import type { ChecklistAnalytic, TodoItem } from '@/types';
import { useTheme } from '@/hooks/useTheme';

interface TodoBlockProps {
  data: ChecklistAnalytic;
}

export default function TodoBlock({ data }: TodoBlockProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [items, setItems] = useState<TodoItem[]>([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const parsed = parseChecklistReport(data);
    const saved = loadDoneState(data.client_case_id);
    setItems(parsed.map(item => ({ ...item, done: saved[item.id] ?? false })));
  }, [data]);

  const toggle = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.map(item =>
        item.id === id ? { ...item, done: !item.done } : item
      );
      const state: Record<string, boolean> = {};
      next.forEach(item => { state[item.id] = item.done; });
      saveDoneState(data.client_case_id, state);
      return next;
    });
  }, [data.client_case_id]);

  const resetAll = () => {
    setItems(prev => prev.map(item => ({ ...item, done: false })));
    saveDoneState(data.client_case_id, {});
  };

  const doneCount = items.filter(i => i.done).length;
  const total = items.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  if (items.length === 0) return null;

  return (
    <div className="border-t border-nblm-border">
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(v => !v)}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 saul-todo-hover transition-colors group cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-nblm-text-muted shrink-0" />
          <span className="text-[13px] font-semibold text-nblm-text tracking-wide">To-Do</span>
          <motion.span
            animate={{
              backgroundColor: doneCount === total ? 'rgba(52,211,153,0.15)' : isLight ? 'rgba(60,60,56,0.1)' : 'rgba(63,63,70,1)',
              color: doneCount === total ? 'rgb(52,211,153)' : isLight ? 'rgb(122,120,112)' : 'rgb(161,161,170)',
            }}
            transition={{ duration: 0.3 }}
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
          >
            {doneCount}/{total}
          </motion.span>
        </div>

        <div className="flex items-center gap-1.5">
          <AnimatePresence>
            {doneCount > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 0, scale: 1 }}
                whileHover={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
                onClick={e => { e.stopPropagation(); resetAll(); }}
                title="Reset all"
                className="p-1 text-nblm-text-muted hover:text-nblm-text"
              >
                <RotateCcw className="w-3 h-3" />
              </motion.button>
            )}
          </AnimatePresence>
          {/* Single chevron that rotates */}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <ChevronDown className="w-4 h-4 text-nblm-text-muted" />
          </motion.div>
        </div>
      </div>

      {/* Collapsible body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="todo-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {/* Progress bar */}
            <div className="px-4 pb-2">
              <div className="h-1 w-full saul-progress-track rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  animate={{
                    width: `${progress}%`,
                    backgroundColor: doneCount === total ? 'rgb(52,211,153)' : 'rgb(113,113,122)',
                  }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Items */}
            <ul className="pb-3 px-2 space-y-0.5">
              {items.map((item, i) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18, delay: i * 0.04, ease: 'easeOut' }}
                >
                  <TodoRow item={item} onToggle={toggle} />
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TodoRow({ item, onToggle }: { item: TodoItem; onToggle: (id: string) => void }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  return (
    <button
      onClick={() => onToggle(item.id)}
      className={cn(
        "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left",
        "saul-todo-hover transition-colors group"
      )}
    >
      {/* Animated checkbox */}
      <motion.span
        animate={{
          backgroundColor: item.done ? 'rgb(16,185,129)' : 'transparent',
          borderColor: item.done ? 'rgb(16,185,129)' : isLight ? 'rgb(180,176,168)' : 'rgb(82,82,91)',
        }}
        transition={{ duration: 0.2 }}
        className="mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center group-hover:border-nblm-text-muted"
      >
        <AnimatePresence>
          {item.done && (
            <motion.svg
              key="tick"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'backOut' }}
              width="10" height="8" viewBox="0 0 10 8" fill="none"
            >
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.span>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <motion.p
          animate={{ color: item.done
            ? (isLight ? 'rgb(160,156,148)' : 'rgb(82,82,91)')
            : (isLight ? 'rgb(60,60,56)'   : 'rgb(228,228,231)') }}
          transition={{ duration: 0.2 }}
          className={cn("text-[13px] font-medium leading-snug", item.done && "line-through")}
        >
          {item.label}
        </motion.p>
        {item.description && (
          <motion.p
            animate={{ color: item.done
              ? (isLight ? 'rgb(180,176,168)' : 'rgb(63,63,70)')
              : (isLight ? 'rgb(122,120,112)' : 'rgb(88,95,100)') }}
            transition={{ duration: 0.2 }}
            className="text-[11px] mt-0.5 leading-snug"
          >
            {item.description}
          </motion.p>
        )}
      </div>
    </button>
  );
}
