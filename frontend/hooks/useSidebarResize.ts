'use client';

import { useState, useEffect, useRef } from 'react';
import { SIDEBAR_WIDTH, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, CHAT_MIN_WIDTH } from '@/lib/constants';

export interface UseSidebarResizeReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  leftOpen: boolean;
  rightOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  handleToggleLeft: () => void;
  handleToggleRight: () => void;
  handleLeftResizeStart: (e: React.MouseEvent) => void;
  handleRightResizeStart: (e: React.MouseEvent) => void;
}

/**
 * Manages open/closed state + drag-to-resize for both sidebars.
 * Automatically collapses sidebars when the chat area would fall below CHAT_MIN_WIDTH.
 */
export function useSidebarResize(): UseSidebarResizeReturn {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(SIDEBAR_WIDTH);
  const [rightWidth, setRightWidth] = useState(SIDEBAR_WIDTH);
  const containerRef = useRef<HTMLDivElement>(null!);

  const dragging = useRef<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const startW = useRef(0);

  // Attach global mouse listeners for drag
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const totalWidth = containerRef.current.offsetWidth;
      const delta = e.clientX - startX.current;

      if (dragging.current === 'left') {
        const newW = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, startW.current + delta));
        const rightW = rightOpen ? rightWidth : 0;
        if (totalWidth - newW - rightW >= CHAT_MIN_WIDTH) setLeftWidth(newW);
      } else {
        const newW = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, startW.current - delta));
        const leftW = leftOpen ? leftWidth : 0;
        if (totalWidth - leftW - newW >= CHAT_MIN_WIDTH) setRightWidth(newW);
      }
    };

    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [leftOpen, rightOpen, leftWidth, rightWidth]);

  // Collapse when container gets too narrow
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const totalWidth = el.offsetWidth;
      const leftW = leftOpen ? leftWidth : 0;
      const rightW = rightOpen ? rightWidth : 0;
      if (totalWidth - leftW - rightW < CHAT_MIN_WIDTH) {
        if (rightOpen) { setRightOpen(false); return; }
        if (leftOpen) setLeftOpen(false);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [leftOpen, rightOpen, leftWidth, rightWidth]);

  const handleLeftResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = 'left';
    startX.current = e.clientX;
    startW.current = leftWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleRightResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = 'right';
    startX.current = e.clientX;
    startW.current = rightWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleToggleLeft = () => {
    if (!leftOpen) {
      const totalWidth = containerRef.current?.offsetWidth ?? window.innerWidth;
      const rightW = rightOpen ? rightWidth : 0;
      if (totalWidth - leftWidth - rightW < CHAT_MIN_WIDTH && rightOpen) setRightOpen(false);
    }
    setLeftOpen(v => !v);
  };

  const handleToggleRight = () => {
    if (!rightOpen) {
      const totalWidth = containerRef.current?.offsetWidth ?? window.innerWidth;
      const leftW = leftOpen ? leftWidth : 0;
      if (totalWidth - leftW - rightWidth < CHAT_MIN_WIDTH && leftOpen) setLeftOpen(false);
    }
    setRightOpen(v => !v);
  };

  return {
    containerRef, leftOpen, rightOpen,
    leftWidth, rightWidth,
    handleToggleLeft, handleToggleRight,
    handleLeftResizeStart, handleRightResizeStart,
  };
}
