'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import SidebarLeft from '@/components/layout/SidebarLeft';
import ChatArea from '@/components/layout/ChatArea';
import SidebarRight from '@/components/layout/SidebarRight';
import { useSidebarResize } from '@/hooks/useSidebarResize';
import { SAMPLE_MARKDOWN } from '@/lib/constants';
import type { SourceInfo } from '@/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'sources' | 'chat' | 'toc'>('chat');
  const [activeSource, setActiveSource] = useState<string | SourceInfo | null>(null);
  const { containerRef, leftOpen, rightOpen, leftWidth, rightWidth, handleToggleLeft, handleToggleRight, handleLeftResizeStart, handleRightResizeStart } = useSidebarResize();

  const handleSourceClick = (heading: string) => {
    setActiveSource(heading);
    setActiveTab('chat');
  };

  return (
    <div className="flex flex-col h-screen w-full bg-nblm-bg text-nblm-text overflow-hidden font-sans">
      <Header />

      {/* Mobile Tabs — only below md */}
      <div className="flex md:hidden border-b border-nblm-border bg-nblm-panel shrink-0">
        {(['sources', 'chat', 'toc'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${activeTab === tab
              ? 'text-white border-b-2 border-white'
              : 'text-zinc-400 hover:bg-zinc-800'
              }`}
          >
            {tab === 'toc' ? 'Contents' : tab}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">

        {/* LEFT SIDEBAR */}
        <div
          className={`
            hidden md:flex flex-col h-full bg-nblm-bg border-r border-nblm-border
            transition-[width] duration-300 ease-in-out overflow-hidden shrink-0
            ${leftOpen ? '' : 'w-0 border-r-0'}
          `}
          style={leftOpen ? { width: leftWidth } : undefined}
        >
          <SidebarLeft onToggle={handleToggleLeft} onSourceSelect={setActiveSource} />
        </div>

        {/* LEFT DRAG HANDLE */}
        {leftOpen && (
          <div
            onMouseDown={handleLeftResizeStart}
            className="hidden md:flex w-1 shrink-0 cursor-col-resize items-center justify-center group z-10 hover:bg-zinc-600/40 transition-colors"
            title="Drag to resize"
          >
            <div className="w-0.5 h-8 rounded-full bg-nblm-border group-hover:bg-zinc-500 transition-colors" />
          </div>
        )}

        {/* Mobile: only one panel visible at a time */}
        <div className={`${activeTab === 'sources' ? 'flex' : 'hidden'} md:hidden flex-1 flex-col h-full bg-nblm-bg`}>
          <SidebarLeft onToggle={() => setActiveTab('chat')} onSourceSelect={setActiveSource} />
        </div>

        {/* CHAT AREA */}
        <div className={`
          ${activeTab === 'chat' ? 'flex' : 'hidden'} md:flex
          flex-1 flex-col h-full overflow-hidden bg-nblm-panel
          border-nblm-border relative
          ${leftOpen ? '' : 'border-l border-nblm-border'}
          ${rightOpen ? '' : 'border-r border-nblm-border'}
          min-w-0
        `}>
          <ChatArea
            activeSource={activeSource}
            onClearSource={() => setActiveSource(null)}
            leftOpen={leftOpen}
            rightOpen={rightOpen}
            onToggleLeft={handleToggleLeft}
            onToggleRight={handleToggleRight}
          />
        </div>

        {/* RIGHT DRAG HANDLE */}
        {rightOpen && (
          <div
            onMouseDown={handleRightResizeStart}
            className="hidden md:flex w-1 shrink-0 cursor-col-resize items-center justify-center group z-10 hover:bg-zinc-600/40 transition-colors"
            title="Drag to resize"
          >
            <div className="w-0.5 h-8 rounded-full bg-nblm-border group-hover:bg-zinc-500 transition-colors" />
          </div>
        )}

        {/* RIGHT SIDEBAR */}
        <div
          className={`
            hidden md:flex flex-col h-full bg-nblm-bg border-l border-nblm-border
            transition-[width] duration-300 ease-in-out overflow-hidden shrink-0
            ${rightOpen ? '' : 'w-0 border-l-0'}
          `}
          style={rightOpen ? { width: rightWidth } : undefined}
        >
          <SidebarRight markdownContent={SAMPLE_MARKDOWN} onSourceClick={handleSourceClick} onToggle={handleToggleRight} />
        </div>

        {/* Mobile TOC */}
        <div className={`${activeTab === 'toc' ? 'flex' : 'hidden'} md:hidden flex-1 flex-col h-full bg-nblm-bg`}>
          <SidebarRight markdownContent={SAMPLE_MARKDOWN} onSourceClick={handleSourceClick} onToggle={() => setActiveTab('chat')} />
        </div>
      </div>
    </div>
  );
}

