'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { SIDEBAR_WIDTH, CHAT_MIN_WIDTH } from '@/lib/constants';

interface UseSidebarResizeReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  leftOpen: boolean;
  rightOpen: boolean;
  handleToggleLeft: () => void;
  handleToggleRight: () => void;
}

/**
 * Manages the open/closed state of both sidebars, automatically collapsing
 * them when the chat area would fall below CHAT_MIN_WIDTH.
 */
export function useSidebarResize(): UseSidebarResizeReturn {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null!);

  // Collapse sidebars when the chat area gets too narrow
  const recalcCollapse = useCallback(() => {
    const totalWidth = containerRef.current?.offsetWidth ?? window.innerWidth;
    const leftW = leftOpen ? SIDEBAR_WIDTH : 0;
    const rightW = rightOpen ? SIDEBAR_WIDTH : 0;
    const chatW = totalWidth - leftW - rightW;

    if (chatW < CHAT_MIN_WIDTH) {
      if (rightOpen) { setRightOpen(false); return; }
      if (leftOpen) setLeftOpen(false);
    }
  }, [leftOpen, rightOpen]);

  useEffect(() => {
    recalcCollapse();
  }, [leftOpen, rightOpen, recalcCollapse]);

  // Watch container size with ResizeObserver
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

  return { containerRef, leftOpen, rightOpen, handleToggleLeft, handleToggleRight };
}
