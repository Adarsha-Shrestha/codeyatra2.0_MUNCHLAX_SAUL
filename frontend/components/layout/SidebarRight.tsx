'use client';

import { AlignLeft, PanelRight, Loader2, CheckCircle2, CheckSquare, ChevronDown } from 'lucide-react';
import type { SidebarRightProps, ChecklistAnalytic } from '@/types';
import TodoBlock from '@/components/layout/TodoBlock';
import { ANALYTICS_HEADING_MAP } from '@/lib/constants';

/* ─── Ghost skeleton shown when no checklist data is available ────────────── */
function TodoGhost() {
  return (
    <div className="border-t border-nblm-border">
      <div className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-nblm-text-muted shrink-0" />
          <span className="text-[13px] font-semibold text-nblm-text tracking-wide">To-Do</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-nblm-panel text-nblm-text-muted">—</span>
        </div>
        <ChevronDown className="w-4 h-4 text-nblm-text-muted" />
      </div>
      <div className="px-4 pb-4 space-y-3 animate-pulse">
        <div className="h-1 w-full bg-nblm-panel rounded-full" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-start gap-3 px-3">
            <div className="w-4 h-4 rounded border border-nblm-border bg-nblm-panel shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-nblm-panel rounded w-3/4" />
              <div className="h-2.5 bg-nblm-panel rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SidebarRight({ markdownContent, onSourceClick, onToggle, checklistData, analyticsLoading }: SidebarRightProps) {
  const loadingMap = analyticsLoading ?? {};
  const headings = markdownContent
    .split('\n')
    .filter(line => line.startsWith('#'))
    .map(line => {
      const level = line.match(/^#+/)?.[0].length || 1;
      const text = line.replace(/^#+\s*/, '').trim();
      return { level, text };
    });

  // Check if a heading has an analytic type and whether it's loading / already loaded
  const getHeadingStatus = (text: string): 'idle' | 'loading' | 'done' => {
    const analyticType = ANALYTICS_HEADING_MAP[text];
    if (!analyticType) return 'idle';
    if (loadingMap[text]) return 'loading';
    return 'idle';
  };

  return (
    <aside className="w-full h-full bg-nblm-bg flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 flex items-center justify-between shrink-0">
        <h2 className="text-[16px] font-semibold text-nblm-text tracking-wide flex items-center gap-2">
          <AlignLeft className="w-5 h-5" /> Table of Contents
        </h2>
        <button onClick={onToggle} title="Collapse sidebar" className="text-nblm-text-muted hover:text-nblm-text transition-colors">
          <PanelRight className="w-5 h-5" />
        </button>
      </div>

      {/* TOC List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {headings.length === 0 ? (
          <p className="text-nblm-text-muted text-sm px-2">No headings found.</p>
        ) : (
          headings.map((heading, idx) => (
            <button
              key={idx}
              onClick={() => onSourceClick(heading.text)}
              className="w-full text-left cursor-pointer text-sm text-nblm-text-muted hover:text-nblm-text hover:bg-nblm-panel rounded-lg px-2 py-1.5 transition-colors truncate flex items-center gap-1.5"
              style={{
                paddingLeft: `${(heading.level - 1) * 14 + 8}px`,
                fontSize: heading.level === 1 ? '13px' : heading.level === 2 ? '12px' : '11px'
              }}
              title={heading.text}
            >
              <span className="truncate flex-1">
                {heading.level <= 2 ? (
                  <span className={heading.level === 1 ? 'font-semibold text-nblm-text' : 'font-medium text-nblm-text-muted'}>
                    {heading.text}
                  </span>
                ) : (
                  <span className="text-nblm-text-muted">{heading.text}</span>
                )}
              </span>
              {getHeadingStatus(heading.text) === 'loading' && (
                <Loader2 className="w-3 h-3 text-nblm-text-muted animate-spin shrink-0" />
              )}
            </button>
          ))
        )}
      </div>

      {/* ── Todo Block ─────────────────────── */}
      {checklistData ? <TodoBlock data={checklistData} /> : <TodoGhost />}
    </aside>
  );
}
