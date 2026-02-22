'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import SidebarLeft from './components/SidebarLeft';
import ChatArea from './components/ChatArea';
import SidebarRight from './components/SidebarRight';
import { SourceInfo } from './components/SidebarLeft';

const SIDEBAR_WIDTH = 320;
const CHAT_MIN_WIDTH = 480; // sm breakpoint equivalent

const sampleMarkdown = `
# Principles and Operations of Relational Algebra
## 1. Introduction
Relational algebra is a mathematical framework for querying relational data.
## 2. Core Operations
Here are the core operators of relational algebra.
### 2.1 Selection (σ)
Selection is like a sieve—it filters rows based on a condition.
### 2.2 Projection (π)
Projection acts like a mask—it shows only specific columns.
### 2.3 Union (∪)
Combines the tuples of two relations into one.
### 2.4 Difference (−)
Returns tuples in one relation but not the other.
### 2.5 Cartesian Product (×)
Produces all combinations of tuples from two relations.
## 3. Joins
Joins connect different parts of data together.
### 3.1 Natural Join (⋈)
Automatically joins on common attributes.
### 3.2 Left Outer Join (⟕)
Includes all tuples from the left relation.
### 3.3 Right Outer Join (⟖)
Includes all tuples from the right relation.
### 3.4 Full Outer Join (⟗)
Includes all tuples from both relations.
## 4. Extended Operators
### 4.1 Division (÷)
Used for "for all" queries.
### 4.2 Rename (ρ)
Renames a relation or its attributes.
### 4.3 Aggregate Functions (𝓖)
Performs Sum, Avg, Count, etc.
## 5. Summary
Relational algebra symbols are tools in a specialized workshop. The Selection (σ) tool acts like a sieve, while Projection (π) acts like a mask, and Join (⋈) acts like industrial glue.
`;

export default function Home() {
  const [activeTab, setActiveTab] = useState<'sources' | 'chat' | 'toc'>('chat');
  const [activeSource, setActiveSource] = useState<string | SourceInfo | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-collapse sidebars when chat would be squeezed below min width
  const recalcCollapse = useCallback(() => {
    const totalWidth = containerRef.current?.offsetWidth ?? window.innerWidth;
    const leftW = leftOpen ? SIDEBAR_WIDTH : 0;
    const rightW = rightOpen ? SIDEBAR_WIDTH : 0;
    const chatW = totalWidth - leftW - rightW;

    if (chatW < CHAT_MIN_WIDTH) {
      // Close the right first, then left if still too small
      if (rightOpen) {
        setRightOpen(false);
        return;
      }
      if (leftOpen) {
        setLeftOpen(false);
      }
    }
  }, [leftOpen, rightOpen]);

  // Also auto-open sidebars if there's enough room again
  const recalcExpand = useCallback(() => {
    const totalWidth = containerRef.current?.offsetWidth ?? window.innerWidth;
    if (!leftOpen && totalWidth - SIDEBAR_WIDTH >= CHAT_MIN_WIDTH) {
      // We have room for at least one sidebar
      setLeftOpen(true);
    }
    if (!rightOpen && totalWidth - (leftOpen ? SIDEBAR_WIDTH : 0) - SIDEBAR_WIDTH >= CHAT_MIN_WIDTH) {
      setRightOpen(true);
    }
  }, [leftOpen, rightOpen]);

  useEffect(() => {
    recalcCollapse();
  }, [leftOpen, rightOpen]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const totalWidth = el.offsetWidth;
      const leftW = leftOpen ? SIDEBAR_WIDTH : 0;
      const rightW = rightOpen ? SIDEBAR_WIDTH : 0;
      const chatW = totalWidth - leftW - rightW;
      if (chatW < CHAT_MIN_WIDTH) {
        if (rightOpen) { setRightOpen(false); return; }
        if (leftOpen) setLeftOpen(false);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [leftOpen, rightOpen]);

  const handleToggleLeft = () => {
    if (!leftOpen) {
      // Opening: ensure there's room
      const totalWidth = containerRef.current?.offsetWidth ?? window.innerWidth;
      const rightW = rightOpen ? SIDEBAR_WIDTH : 0;
      if (totalWidth - SIDEBAR_WIDTH - rightW < CHAT_MIN_WIDTH && rightOpen) {
        setRightOpen(false);
      }
    }
    setLeftOpen(v => !v);
  };

  const handleToggleRight = () => {
    if (!rightOpen) {
      const totalWidth = containerRef.current?.offsetWidth ?? window.innerWidth;
      const leftW = leftOpen ? SIDEBAR_WIDTH : 0;
      if (totalWidth - SIDEBAR_WIDTH - leftW < CHAT_MIN_WIDTH && leftOpen) {
        setLeftOpen(false);
      }
    }
    setRightOpen(v => !v);
  };

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
            transition-all duration-300 ease-in-out overflow-hidden shrink-0
            ${leftOpen ? 'w-[320px]' : 'w-0 border-r-0'}
          `}
        >
          <SidebarLeft onToggle={handleToggleLeft} onSourceSelect={setActiveSource} />
        </div>

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
        `}
          style={{ borderLeft: !leftOpen ? undefined : undefined }}
        >
          <ChatArea
            activeSource={activeSource}
            onClearSource={() => setActiveSource(null)}
            leftOpen={leftOpen}
            rightOpen={rightOpen}
            onToggleLeft={handleToggleLeft}
            onToggleRight={handleToggleRight}
          />
        </div>

        {/* RIGHT SIDEBAR */}
        <div
          className={`
            hidden md:flex flex-col h-full bg-nblm-bg border-l border-nblm-border
            transition-all duration-300 ease-in-out overflow-hidden shrink-0
            ${rightOpen ? 'w-[320px]' : 'w-0 border-l-0'}
          `}
        >
          <SidebarRight markdownContent={sampleMarkdown} onSourceClick={handleSourceClick} onToggle={handleToggleRight} />
        </div>

        {/* Mobile TOC */}
        <div className={`${activeTab === 'toc' ? 'flex' : 'hidden'} md:hidden flex-1 flex-col h-full bg-nblm-bg`}>
          <SidebarRight markdownContent={sampleMarkdown} onSourceClick={handleSourceClick} onToggle={() => setActiveTab('chat')} />
        </div>
      </div>
    </div>
  );
}
