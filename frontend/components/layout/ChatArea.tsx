'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Settings2, MoreVertical, ArrowUp, X,
  PanelLeft, PanelRight, Link as LinkIcon,
  Save, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BlurText from '@/components/ui/BlurText';
import type { ChatAreaProps, SourceInfo, Message, ModelId, AIResponse, AISource } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import ModelSelector from '@/components/layout/ModelSelector';
import AssistantMessage from '@/components/layout/AssistantMessage';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export default function ChatArea({
  activeSource,
  onClearSource,
  onSourceSelect,
  onSaveChat,
  sessionKey,
  initialMessages,
  leftOpen,
  rightOpen,
  onToggleLeft,
  onToggleRight,
  userName = 'Rohan'
}: ChatAreaProps) {
  const { theme } = useTheme();
  const logoSrc = theme === 'light' ? '/logo_light.png' : '/logo.png';
  const [textContent, setTextContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelId>('briefing');

  // Reset messages when a session is loaded
  useEffect(() => {
    setMessages(initialMessages ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  // Autosave — debounced 2s after messages change
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (messages.length === 0) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      onSaveChat?.(messages);
    }, 2000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // TODO: replace with real API call — mock demo response
    setTimeout(() => {
      const mockResponse: AIResponse = {
        answer:
          "Case 001 pertains to the theft of Sita Sharma's red mountain bike. On April 9th, at approximately 2:30 PM, Sita parked her bike outside a grocery store in Patan Durbar Square. Upon returning around 15 minutes later, she found her bike missing. A local shopkeeper reported seeing Raju Karki near the bike as he ridden it away.\n\nIn an affidavit from Gopal Shrestha, another witness at the scene, Raju Karki was observed near a parked red mountain bike on the same day. Shrestha described witnessing Raju unlock or break the lock and ride away. He also mentioned knowing Raju from the neighborhood and recognizing him clearly.\n\nBoth the FIRs (Sources 4 and 5) corroborate these accounts, suggesting that the theft involved Raju Karki. Therefore, Case 001 likely involves this incident of theft by Raju Karki, supported by evidence from multiple witnesses. [SOURCE 4], [SOURCE 5].",
        sources: [
          { id: 1, title: 'Affidavit.txt', date: 'Unknown', type: 'Document' },
          { id: 2, title: 'Affidavit.txt', date: 'Unknown', type: 'Document' },
          { id: 3, title: 'Affidavit', date: 'Unknown', type: 'client_case' },
          { id: 4, title: 'FIR.txt', date: 'Unknown', type: 'Document' },
          { id: 5, title: 'First Information Report (FIR)', date: '2024-04-10', type: 'Document' },
        ],
        confidence: 'High',
        evaluation_metrics: {
          score: 7,
          is_helpful: true,
          is_grounded: true,
          hallucination_detected: false,
          reason:
            'The answer correctly summarizes the case but contains minor inaccuracies. The event was actually filed on April 10th, not April 9th.',
          suggestion:
            'Correct the date from April 9th to April 10th and fix the grammar in the request statement.',
        },
      };
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: mockResponse.answer,
          aiResponse: mockResponse,
        },
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
        <div className="p-4 flex items-center justify-between border-b border-nblm-border shrink-0 bg-nblm-panel sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleLeft}
              title={leftOpen ? 'Collapse sources' : 'Expand sources'}
              className={`hidden md:flex hover:text-nblm-text transition-colors p-1 ${leftOpen ? 'text-nblm-text-muted' : 'text-nblm-text'}`}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <h2 className="text-[13px] font-medium text-zinc-400 tracking-wide flex items-center gap-2 truncate max-w-50 md:max-w-md">
              <span className="truncate">{title}</span>
              {!isString && sourceObj && (
                <span className="saul-type-badge text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 border">
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
              className="saul-icon-close transition-colors p-1 ml-2 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleRight}
              title={rightOpen ? 'Collapse contents' : 'Expand contents'}
              className={`hidden md:flex hover:text-nblm-text transition-colors p-1 ${rightOpen ? 'text-nblm-text-muted' : 'text-nblm-text'}`}
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
            className={`hidden md:flex hover:text-nblm-text transition-colors p-1 ${leftOpen ? 'text-nblm-text-muted' : 'text-nblm-text'}`}
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
                src={logoSrc}
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
          <ModelSelector value={selectedModel} onValueChange={setSelectedModel} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:text-nblm-text transition-colors p-1">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  if (messages.length > 0) onSaveChat?.(messages);
                }}
                disabled={messages.length === 0}
              >
                <Save className="w-4 h-4" />
                Save chat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-amber-400 focus:text-amber-300">
                <Sparkles className="w-4 h-4" />
                Try Premium
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                src={logoSrc}
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
                        : 'bg-transparent text-nblm-text w-full max-w-full'
                    }`}
                  >
                    {msg.role === 'assistant' && msg.aiResponse ? (
                      <AssistantMessage
                        response={msg.aiResponse}
                        model={selectedModel}
                        onSourceClick={async (src: AISource) => {
                          try {
                            const res = await fetch('/api/sources');
                            const list: SourceInfo[] = await res.json();
                            const match = list.find(
                              (s) => s.title.toLowerCase() === src.title.toLowerCase()
                            );
                            if (match) onSourceSelect?.(match);
                          } catch (e) {
                            console.error('Could not open source:', e);
                          }
                        }}
                      />
                    ) : msg.role === 'assistant' ? (
                      <p className="text-[15px] leading-relaxed">{msg.content}</p>
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
            <p className="text-[11px] text-nblm-text-muted text-center mb-4">Today • {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
           
          )}
          <div className="relative bg-nblm-bg rounded-full border border-nblm-border shadow-lg overflow-hidden focus-within:ring-1 focus-within:ring-nblm-border transition-all">
            <textarea
              placeholder="Start typing..."
              className="w-full bg-transparent text-nblm-text px-4 py-4 pr-14 min-h-14 resize-none focus:outline-none text-[15px] placeholder-nblm-text-muted"
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
          <p className="text-[10px] text-nblm-text-muted text-center mt-3 font-medium">
            Saul can be inaccurate: please double check its responses.
          </p>
        </div>
      </div>
    </div>
  );
}
