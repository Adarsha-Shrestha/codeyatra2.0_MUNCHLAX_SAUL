'use client';

import { useState, useEffect } from 'react';
import {
  Settings2, MoreVertical, ArrowUp, X,
  PanelLeft, PanelRight, Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BlurText from '@/components/ui/BlurText';
import SplitText from '@/components/ui/SplitText';
import type { ChatAreaProps, SourceInfo, Message } from '@/types';
import ModelSelector from '@/components/layout/ModelSelector';

export default function ChatArea({
  activeSource,
  onClearSource,
  leftOpen,
  rightOpen,
  onToggleLeft,
  onToggleRight,
  userName = 'Rohan'
}: ChatAreaProps) {
  const [textContent, setTextContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (typeof activeSource !== 'string' && activeSource?.fileType.includes('text')) {
      fetch(activeSource.url)
        .then(res => res.text())
        .then(text => setTextContent(text))
        .catch(err => console.error('Failed to load text:', err));
    }
  }, [activeSource]);

  const handleSaveText = async () => {
    if (typeof activeSource === 'string' || !activeSource) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeSource.id, content: textContent }),
      });
      if (!res.ok) throw new Error('Failed to save');
      alert('Saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Error saving document');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    const newMsg: Message = { id: Date.now().toString(), role: 'user', content: inputValue };
    setMessages(prev => [...prev, newMsg]);
    setInputValue('');

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: "I am SAUL. I'm currently in development, but I'll soon be able to assist you with the sources you've uploaded!"
        }
      ]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ─── Source Viewer ───────────────────────────────────────────────────────────
  if (activeSource) {
    const isString = typeof activeSource === 'string';
    const sourceObj = !isString ? (activeSource as SourceInfo) : null;
    const title = isString ? activeSource : sourceObj?.title;
    const isText = sourceObj && sourceObj.fileType.includes('text');
    const isPdf = sourceObj && sourceObj.fileType.includes('pdf');

    return (
      <div className="flex-1 flex flex-col bg-nblm-panel h-full relative overflow-hidden">
        {/* Source Toolbar */}
        <div className="p-4 flex items-center justify-between border-b border-zinc-800 shrink-0 bg-nblm-panel sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleLeft}
              title={leftOpen ? 'Collapse sources' : 'Expand sources'}
              className={`hidden md:flex hover:text-white transition-colors p-1 ${leftOpen ? 'text-zinc-500' : 'text-zinc-300'}`}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <h2 className="text-[13px] font-medium text-zinc-400 tracking-wide flex items-center gap-2 truncate max-w-50 md:max-w-md">
              <span className="truncate">{title}</span>
              {!isString && sourceObj && (
                <span className="bg-zinc-800/80 text-[10px] px-1.5 py-0.5 rounded text-zinc-400 uppercase tracking-wider shrink-0 border border-zinc-700/50">
                  Type {sourceObj.dataType}
                </span>
              )}
            </h2>
          </div>
          <div className="flex gap-2 items-center">
            {isText && (
              <button
                onClick={handleSaveText}
                disabled={isSaving}
                className="bg-zinc-200 hover:bg-white text-zinc-900 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-semibold disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Edits'}
              </button>
            )}
            <button
              onClick={onClearSource}
              title="Close source view"
              className="hover:text-white text-zinc-400 transition-colors p-1 ml-2 bg-zinc-800/50 hover:bg-zinc-700 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleRight}
              title={rightOpen ? 'Collapse contents' : 'Expand contents'}
              className={`hidden md:flex hover:text-white transition-colors p-1 ${rightOpen ? 'text-zinc-500' : 'text-zinc-300'}`}
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Source Content */}
        <div className={`flex-1 overflow-hidden flex flex-col ${isPdf ? '' : 'p-6 md:p-8'}`}>
          {isString ? (
            <>
              <h1 className="text-2xl font-bold text-nblm-text mb-6 border-b border-nblm-border pb-4 w-full md:max-w-4xl mx-auto">
                {activeSource}
              </h1>
              <p className="text-nblm-text-muted leading-relaxed md:max-w-4xl mx-auto text-sm md:text-base">
                This is a simulated view of the source material for the section: &quot;{activeSource}&quot;.
              </p>
            </>
          ) : isText ? (
            <textarea
              className="w-full h-full bg-transparent border-0 rounded-2xl p-6 text-nblm-text font-mono text-sm md:text-base resize-none focus:outline-none leading-relaxed max-w-5xl mx-auto"
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
              placeholder="Type to edit this document..."
            />
          ) : isPdf ? (
            <iframe src={sourceObj!.url} className="w-full h-full border-none bg-nblm-panel" title={title} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-nblm-text-muted">
              <LinkIcon className="w-12 h-12 mb-4 opacity-50" />
              <p>Cannot preview this file type natively.</p>
              <a href={sourceObj!.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline mt-2 text-sm">
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Default Chat View ────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-nblm-panel h-full relative overflow-hidden">
      {/* Chat Toolbar */}
      <div className="p-4 flex items-center justify-between border-b border-transparent shrink-0 bg-transparent sticky top-0 z-10 transition-colors">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleLeft}
            title={leftOpen ? 'Collapse sources' : 'Expand sources'}
            className={`hidden md:flex hover:text-white transition-colors p-1 ${leftOpen ? 'text-zinc-500' : 'text-nblm-text'}`}
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Centred logo after first message */}
        <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
          {messages.length > 0 && (
            <div className="flex items-center gap-3 overflow-hidden text-zinc-400">
              <motion.img
                layoutId="saul-logo"
                src="/logo.png"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                alt="SAUL Logo"
                className="w-10 h-10 object-contain"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 text-zinc-400 items-center">
          <ModelSelector />
          <button className="hover:text-nblm-text transition-colors p-1"><MoreVertical className="w-5 h-5" /></button>
          <button
            onClick={onToggleRight}
            title={rightOpen ? 'Collapse contents' : 'Expand contents'}
            className={`hidden md:flex hover:text-nblm-text transition-colors p-1 ${rightOpen ? 'text-zinc-500' : 'text-nblm-text'}`}
          >
            <PanelRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto w-full max-w-3xl mx-auto flex flex-col pt-3 pb-40 px-6 scroll-smooth">
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            <motion.div
              key="idle-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="flex-1 flex flex-col items-center justify-center mb-10"
            >
              <motion.img
                layoutId="saul-logo"
                src="/logo.png"
                alt="SAUL"
                className="w-48 md:w-56 mb-6 drop-shadow-2xl"
                style={{ filter: 'brightness(1.1)' }}
              />
              <BlurText
                text={`Good Afternoon, ${userName}`}
                delay={50}
                animateBy="words"
                direction="top"
                className="text-3xl md:text-4xl text-nblm-text-muted tracking-wide font-medium"
              />
            </motion.div>
          ) : (
            <motion.div
              key="chat-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6 flex-1 w-full"
            >
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
                  className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3 text-[15px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-nblm-bg text-nblm-text border border-nblm-border'
                        : 'bg-transparent text-nblm-text'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <SplitText
                        text={msg.content}
                        delay={20}
                        duration={0.1}
                        splitType="words, chars"
                        from={{ opacity: 0 }}
                        to={{ opacity: 1 }}
                        textAlign="left"
                      />
                    ) : (
                      msg.content
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-nblm-panel via-nblm-panel to-transparent pt-12 pb-6 px-4 md:px-10 z-20">
        <div className="max-w-3xl mx-auto">
          {messages.length > 0 && (
            <p className="text-[11px] text-zinc-500 text-center mb-4">Today • {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
           
          )}
          <div className="relative bg-nblm-bg rounded-full border border-nblm-border shadow-lg overflow-hidden focus-within:ring-1 focus-within:ring-zinc-600 transition-all">
            <textarea
              placeholder="Start typing..."
              className="w-full bg-transparent text-nblm-text px-4 py-4 pr-14 min-h-14 resize-none focus:outline-none text-[15px] placeholder-zinc-600"
              rows={1}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-3">
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="w-8 h-8 rounded-full bg-zinc-200 text-black flex items-center justify-center hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-zinc-600 text-center mt-3 font-medium">
            Saul can be inaccurate: please double check its responses.
          </p>
        </div>
      </div>
    </div>
  );
}
