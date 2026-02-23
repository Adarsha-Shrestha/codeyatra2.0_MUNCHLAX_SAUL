'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import SidebarLeft from '@/components/layout/SidebarLeft';
import ChatArea from '@/components/layout/ChatArea';
import SidebarRight from '@/components/layout/SidebarRight';
import { useSidebarResize } from '@/hooks/useSidebarResize';
import { ANALYTICS_MARKDOWN, ANALYTICS_HEADING_MAP } from '@/lib/constants';
import { upsertSession } from '@/lib/chatHistory';
import { fetchAnalytics, fetchClients, createClient, fetchCasesForClient, type AllCaseItem, type BackendClient } from '@/lib/api';
import type { SourceInfo, Message, ChatSession, ChecklistAnalytic } from '@/types';

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen w-full bg-nblm-bg text-nblm-text-muted">Loading...</div>}>
      <Home />
    </Suspense>
  );
}

function Home() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'sources' | 'chat' | 'toc'>('chat');
  const [activeSource, setActiveSource] = useState<string | SourceInfo | null>(null);
  const [sessionKey, setSessionKey] = useState('initial');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[] | undefined>(undefined);
  const { containerRef, leftOpen, rightOpen, leftWidth, rightWidth, handleToggleLeft, handleToggleRight, handleLeftResizeStart, handleRightResizeStart } = useSidebarResize();

  // ── Client Management ──────────────────────────────────────────────────────
  const [clients, setClients] = useState<BackendClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientsLoading, setClientsLoading] = useState(true);

  // ── Case Management ────────────────────────────────────────────────────────
  const [cases, setCases] = useState<AllCaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [casesLoading, setCasesLoading] = useState(true);

  // ── Analytics ──────────────────────────────────────────────────────────────
  const [analyticsResults, setAnalyticsResults] = useState<Record<string, { report: string; sources: unknown[] }>>({});
  const [analyticsLoading, setAnalyticsLoading] = useState<Record<string, boolean>>({});
  const [checklistData, setChecklistData] = useState<ChecklistAnalytic | null>(null);

  // Load clients on mount
  useEffect(() => {
    setClientsLoading(true);
    fetchClients()
      .then(data => {
        setClients(data);
        // Check if URL has a client param from /home redirect
        const urlClientId = searchParams.get('client');
        if (urlClientId) {
          const cid = parseInt(urlClientId, 10);
          if (data.some(c => c.client_id === cid)) {
            setSelectedClientId(cid);
          } else if (data.length > 0) {
            setSelectedClientId(data[0].client_id);
          }
        } else if (data.length > 0) {
          setSelectedClientId(data[0].client_id);
        }
      })
      .catch(err => console.error('Failed to fetch clients:', err))
      .finally(() => setClientsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When client changes, load their cases
  useEffect(() => {
    if (!selectedClientId) {
      setCases([]);
      setSelectedCaseId(null);
      setCasesLoading(false);
      return;
    }
    setCasesLoading(true);
    fetchCasesForClient(selectedClientId)
      .then((data: Array<{ case_id: number; client_id: number; description: string | null; created_at: string; updated_at: string; file_count: number }>) => {
        // Map to AllCaseItem shape
        const selectedClient = clients.find(c => c.client_id === selectedClientId);
        const mapped: AllCaseItem[] = data.map(c => ({
          ...c,
          client_name: selectedClient?.client_name || 'Unknown',
        }));
        setCases(mapped);
        if (mapped.length > 0) setSelectedCaseId(mapped[0].case_id);
        else setSelectedCaseId(null);
      })
      .catch(err => {
        console.error('Failed to fetch cases for client:', err);
        setCases([]);
        setSelectedCaseId(null);
      })
      .finally(() => setCasesLoading(false));
  }, [selectedClientId, clients]);

  // Reset analytics cache when case changes
  useEffect(() => {
    setAnalyticsResults({});
    setChecklistData(null);
  }, [selectedCaseId]);

  const selectedClient = clients.find(c => c.client_id === selectedClientId);
  const clientName = selectedClient?.client_name?.split(' ')[0] || '';

  const handleClientChange = useCallback((clientId: number) => {
    setSelectedClientId(clientId);
    // Reset everything on client switch
    setActiveSource(null);
    setInitialMessages(undefined);
    setSessionKey('client-' + clientId + '-' + Date.now());
    setActiveSessionId(null);
  }, []);

  const handleCreateClient = useCallback(async (name: string) => {
    try {
      const newClient = await createClient({ client_name: name });
      setClients(prev => [newClient, ...prev]);
      setSelectedClientId(newClient.client_id);
    } catch (err) {
      console.error('Failed to create client:', err);
    }
  }, []);

  const handleSourceClick = useCallback(async (heading: string) => {
    const analyticType = ANALYTICS_HEADING_MAP[heading];

    if (analyticType && selectedCaseId) {
      setActiveSource(heading);
      setActiveTab('chat');

      // If cached, use it
      if (analyticsResults[heading]) {
        // Already have data, the ChatArea will render it via analyticsContent prop
        return;
      }

      // Fetch from API
      setAnalyticsLoading(prev => ({ ...prev, [heading]: true }));
      try {
        const result = await fetchAnalytics(selectedCaseId, analyticType);
        setAnalyticsResults(prev => ({
          ...prev,
          [heading]: { report: result.report, sources: result.sources || [] },
        }));

        // If this was checklist, update checklist data for TodoBlock
        if (analyticType === 'checklist') {
          setChecklistData({
            analytic_type: 'checklist',
            client_case_id: selectedCaseId.toString(),
            report: result.report,
            sources: result.sources,
          });
        }
      } catch (err) {
        console.error('Analytics failed:', err);
        setAnalyticsResults(prev => ({
          ...prev,
          [heading]: { report: `Error: Failed to generate ${heading}. Please try again.`, sources: [] },
        }));
      } finally {
        setAnalyticsLoading(prev => ({ ...prev, [heading]: false }));
      }
    } else {
      setActiveSource(heading);
      setActiveTab('chat');
    }
  }, [selectedCaseId, analyticsResults]);

  const handleSaveChat = useCallback((messages: Message[]) => {
    const saved = upsertSession(activeSessionId, messages);
    setActiveSessionId(saved.id);
  }, [activeSessionId]);

  const handleLoadSession = useCallback((session: ChatSession) => {
    setInitialMessages(session.messages);
    setSessionKey(session.id);
    setActiveSessionId(session.id);
    setActiveTab('chat');
  }, []);

  const handleCaseChange = useCallback((caseId: number) => {
    setSelectedCaseId(caseId);
    // Reset chat state when switching cases
    setActiveSource(null);
    setInitialMessages(undefined);
    setSessionKey('case-' + caseId + '-' + Date.now());
    setActiveSessionId(null);
  }, []);

  // Get analytics content for active source
  const activeSourceStr = typeof activeSource === 'string' ? activeSource : '';
  const currentAnalyticsContent = analyticsResults[activeSourceStr]?.report || null;
  const currentAnalyticsLoading = analyticsLoading[activeSourceStr] || false;

  return (
    <div className="flex flex-col h-screen w-full bg-nblm-bg text-nblm-text overflow-hidden font-sans">
      <Header
        cases={cases}
        selectedCaseId={selectedCaseId}
        onCaseChange={handleCaseChange}
        isLoading={casesLoading}
        clients={clients}
        selectedClientId={selectedClientId}
        onClientChange={handleClientChange}
        onCreateClient={handleCreateClient}
        clientsLoading={clientsLoading}
      />

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
          <SidebarLeft onToggle={handleToggleLeft} onSourceSelect={setActiveSource} onLoadSession={handleLoadSession} caseId={selectedCaseId} />
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
          <SidebarLeft onToggle={() => setActiveTab('chat')} onSourceSelect={setActiveSource} onLoadSession={handleLoadSession} caseId={selectedCaseId} />
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
            key={sessionKey}
            activeSource={activeSource}
            onClearSource={() => setActiveSource(null)}
            onSourceSelect={setActiveSource}
            onSaveChat={handleSaveChat}
            sessionKey={sessionKey}
            initialMessages={initialMessages}
            leftOpen={leftOpen}
            rightOpen={rightOpen}
            onToggleLeft={handleToggleLeft}
            onToggleRight={handleToggleRight}
            userName={clientName || undefined}
            caseId={selectedCaseId}
            analyticsContent={currentAnalyticsContent}
            analyticsLoading={currentAnalyticsLoading}
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
          <SidebarRight
            markdownContent={ANALYTICS_MARKDOWN}
            onSourceClick={handleSourceClick}
            onToggle={handleToggleRight}
            checklistData={checklistData}
            analyticsLoading={analyticsLoading}
          />
        </div>

        {/* Mobile TOC */}
        <div className={`${activeTab === 'toc' ? 'flex' : 'hidden'} md:hidden flex-1 flex-col h-full bg-nblm-bg`}>
          <SidebarRight
            markdownContent={ANALYTICS_MARKDOWN}
            onSourceClick={handleSourceClick}
            onToggle={() => setActiveTab('chat')}
            checklistData={checklistData}
            analyticsLoading={analyticsLoading}
          />
        </div>
      </div>
    </div>
  );
}

