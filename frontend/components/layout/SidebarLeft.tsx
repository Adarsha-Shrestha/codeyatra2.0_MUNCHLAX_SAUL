'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Check, FileText, ChevronRight, LayoutPanelLeft, FileType, Image as ImageIcon, History, Loader2 } from 'lucide-react';
import type { SourceInfo, SidebarLeftProps, ChatSession } from '@/types';
import AddSourceModal from '@/components/layout/AddSourceModal';
import ChatHistoryPanel from '@/components/layout/ChatHistoryPanel';
import { fetchCaseFiles, getCaseFileDownloadUrl, type BackendCaseFile } from '@/lib/api';

function caseFileToSourceInfo(f: BackendCaseFile): SourceInfo {
  const mimeType = f.mime_type || 'application/octet-stream';
  return {
    id: f.file_id.toString(),
    title: f.filename,
    sourceType: 'file',
    dataType: '1',
    fileType: mimeType,
    url: getCaseFileDownloadUrl(f.file_id),
    createdAt: f.uploaded_at,
    status: f.status,
  };
}

export default function SidebarLeft({ onToggle, onSourceSelect, onLoadSession, caseId }: SidebarLeftProps) {
  const [tab, setTab] = useState<'sources' | 'history'>('sources');
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch sources from backend when case changes
  useEffect(() => {
    if (!caseId) {
      setSources([]);
      return;
    }
    loadSources(caseId);
  }, [caseId]);

  const loadSources = useCallback(async (id: number) => {
    setIsLoading(true);
    try {
      const files = await fetchCaseFiles(id);
      const mapped = files.map(caseFileToSourceInfo);
      setSources(mapped);
      setSelectedIds(new Set(mapped.map(s => s.id)));

      // If any files are still processing, poll for updates
      const hasProcessing = files.some(f => f.status === 'pending' || f.status === 'processing');
      if (hasProcessing) {
        startPolling(id);
      } else {
        stopPolling();
      }
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startPolling = useCallback((id: number) => {
    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      try {
        const files = await fetchCaseFiles(id);
        const mapped = files.map(caseFileToSourceInfo);
        setSources(mapped);
        const hasProcessing = files.some(f => f.status === 'pending' || f.status === 'processing');
        if (!hasProcessing) stopPolling();
      } catch {
        // ignore polling errors
      }
    }, 3000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleSourceAdded = (newSource: SourceInfo) => {
    setSources(prev => [...prev, newSource]);
    setSelectedIds(prev => new Set(prev).add(newSource.id));
    // Start polling to track ingestion status
    if (caseId) startPolling(caseId);
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllSelection = () => {
    if (selectedIds.size === sources.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sources.map(s => s.id)));
  };

  const getIconForSource = (source: SourceInfo) => {
    if (source.fileType.includes('pdf')) return <FileType className="w-4 h-4 text-red-500" />;
    if (source.sourceType === 'scan') return <ImageIcon className="w-4 h-4 text-emerald-500" />;
    return <FileText className="w-4 h-4 text-blue-500" />;
  };

  const isProcessing = (source: SourceInfo) => source.status === 'pending' || source.status === 'processing';

  return (
    <aside className="w-full bg-nblm-bg flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="p-4 flex items-center justify-between shrink-0">
        {/* Tab switcher */}
        <div className="flex items-center gap-0.5 bg-nblm-panel rounded-full p-0.5 border border-nblm-border">
          <button
            onClick={() => setTab('sources')}
            className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-all ${
              tab === 'sources' ? 'saul-tab-active' : 'saul-tab-inactive'
            }`}
          >
            Sources
          </button>
          <button
            onClick={() => { setTab('history'); setHistoryRefreshKey(k => k + 1); }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold transition-all ${
              tab === 'history' ? 'saul-tab-active' : 'saul-tab-inactive'
            }`}
          >
            <History className="w-3 h-3" />
            History
          </button>
        </div>
        <button onClick={onToggle} title="Collapse sidebar" className="text-nblm-text-muted hover:text-nblm-text transition-colors">
          <LayoutPanelLeft className="w-5 h-5" />
        </button>
      </div>

      {/* History tab */}
      {tab === 'history' && (
        <ChatHistoryPanel
          refreshKey={historyRefreshKey}
          onSelectSession={(session) => {
            onLoadSession(session);
          }}
        />
      )}

      {/* Sources tab */}
      {tab === 'sources' && (
        <>

      {/* Add Sources Button */}
      <div className="px-4 pb-4">
        <button
          onClick={() => setIsAddModalOpen(true)}
          disabled={!caseId}
          className="w-full flex items-center justify-center gap-2 bg-nblm-panel hover:bg-nblm-border text-[15px] font-medium py-2.5 rounded-full border border-nblm-border transition-colors text-nblm-text disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Add sources
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search the web for new sources"
            className="w-full bg-nblm-bg border border-nblm-border rounded-full py-2 pl-10 pr-3 text-[15px] focus:outline-none focus:border-nblm-text-muted placeholder-nblm-text-muted text-nblm-text"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-4 pb-4 flex gap-2">
        <button className="flex items-center gap-1.5 bg-nblm-panel text-xs px-3 py-1 rounded-full border border-nblm-border hover:bg-nblm-border transition-colors text-nblm-text">
          <Search className="w-3 h-3 text-zinc-400" /> Web
        </button>
        <button className="flex justify-between items-center gap-1.5 bg-nblm-panel text-xs px-3 py-1 rounded-full border border-nblm-border hover:bg-nblm-border transition-colors flex-1 text-nblm-text">
          <span className="flex items-center gap-1.5">
            <Search className="w-3 h-3 text-zinc-400" /> Fast Research
          </span>
          <ChevronRight className="w-3 h-3 text-zinc-400" />
        </button>
      </div>

      {/* Select All */}
      <div className="px-5 py-2 flex items-center justify-between text-[13px] text-nblm-text-muted">
        <span>Select all sources</span>
        <button
          onClick={toggleAllSelection}
          className="w-5 h-5 rounded bg-nblm-panel border border-nblm-border flex items-center justify-center transition-colors"
        >
          {selectedIds.size > 0 && selectedIds.size === sources.length && (
            <Check className="w-4 h-4 text-white" />
          )}
        </button>
      </div>

      {/* Source List */}
      <div className="flex-1 overflow-y-auto mt-2">
        {isLoading ? (
          // Ghost loading skeleton
          <div className="px-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 bg-nblm-panel rounded border border-nblm-border" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-nblm-panel rounded w-3/4" />
                  <div className="h-3 bg-nblm-panel rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : !caseId ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">Select a case to view sources.</div>
        ) : sources.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">No sources added yet.</div>
        ) : (
          <ul className="space-y-1">
            {sources.map(source => (
              <li
                key={source.id}
                onClick={() => onSourceSelect(source)}
                className={`px-4 py-2.5 flex items-start gap-3 hover:bg-nblm-panel cursor-pointer group transition-all ${
                  isProcessing(source) ? 'opacity-50' : ''
                }`}
              >
                <div className={`bg-nblm-bg p-2 rounded mt-0.5 border border-nblm-border ${isProcessing(source) ? 'animate-pulse' : ''}`}>
                  {isProcessing(source)
                    ? <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                    : getIconForSource(source)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-nblm-text truncate font-medium">{source.title}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 capitalize">
                    {isProcessing(source)
                      ? <span className="text-yellow-500">Ingesting...</span>
                      : source.status === 'failed'
                        ? <span className="text-red-400">Ingestion failed</span>
                        : `Type ${source.dataType} • ${source.sourceType}`
                    }
                  </p>
                </div>
                <button
                  onClick={(e) => toggleSelection(source.id, e)}
                  className={`w-5 h-5 rounded border flex items-center justify-center mt-1 shrink-0 transition-all ${
                    selectedIds.has(source.id)
                      ? 'bg-primary border-primary'
                      : 'bg-transparent border-nblm-border group-hover:border-nblm-text-muted'
                  }`}
                >
                  {selectedIds.has(source.id) && <Check className="w-4 h-4 text-white" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      </>)}


      <AddSourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSourceAdded={handleSourceAdded}
        caseId={caseId}
      />

    </aside>
  );
}
