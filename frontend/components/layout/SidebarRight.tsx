'use client';

import { AlignLeft, PanelRight } from 'lucide-react';
import type { SidebarRightProps } from '@/types';

export default function SidebarRight({ markdownContent, onSourceClick, onToggle }: SidebarRightProps) {
  const headings = markdownContent
    .split('\n')
    .filter(line => line.startsWith('#'))
    .map(line => {
      const level = line.match(/^#+/)?.[0].length || 1;
      const text = line.replace(/^#+\s*/, '').trim();
      return { level, text };
    });

  return (
    <aside className="w-full h-full bg-nblm-bg flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 flex items-center justify-between shrink-0">
        <h2 className="text-[16px] font-semibold text-zinc-400 tracking-wide flex items-center gap-2">
          <AlignLeft className="w-5 h-5" /> Table of Contents
        </h2>
        <button onClick={onToggle} title="Collapse sidebar" className="text-zinc-400 hover:text-white transition-colors">
          <PanelRight className="w-5 h-5" />
        </button>
      </div>

      {/* TOC List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {headings.length === 0 ? (
          <p className="text-zinc-500 text-sm px-2">No headings found.</p>
        ) : (
          headings.map((heading, idx) => (
            <button
              key={idx}
              onClick={() => onSourceClick(heading.text)}
              className="w-full text-left cursor-pointer text-sm text-zinc-400 hover:text-nblm-text hover:bg-[#2b2520] rounded-lg px-2 py-1.5 transition-colors truncate block"
              style={{
                paddingLeft: `${(heading.level - 1) * 14 + 8}px`,
                fontSize: heading.level === 1 ? '13px' : heading.level === 2 ? '12px' : '11px'
              }}
              title={heading.text}
            >
              {heading.level <= 2 ? (
                <span className={heading.level === 1 ? 'font-semibold text-nblm-text' : 'font-medium text-nblm-text-muted'}>
                  {heading.text}
                </span>
              ) : (
                <span className="text-zinc-500">{heading.text}</span>
              )}
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
