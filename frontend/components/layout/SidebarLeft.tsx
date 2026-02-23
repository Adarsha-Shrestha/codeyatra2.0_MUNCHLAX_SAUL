'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Check, FileText, ChevronRight, LayoutPanelLeft, FileType, Image as ImageIcon } from 'lucide-react';
import type { SourceInfo, SidebarLeftProps } from '@/types';
import AddSourceModal from '@/components/layout/AddSourceModal';

export default function SidebarLeft({ onToggle, onSourceSelect }: SidebarLeftProps) {
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/sources');
      if (res.ok) {
        const data = await res.json();
        setSources(data);
        setSelectedIds(new Set(data.map((s: SourceInfo) => s.id)));
      }
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    }
  };

  const handleSourceAdded = (newSource: SourceInfo) => {
    setSources(prev => [...prev, newSource]);
    setSelectedIds(prev => new Set(prev).add(newSource.id));
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

  return (
    <aside className="w-full bg-nblm-bg flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-zinc-400 tracking-wide">Sources</h2>
        <button onClick={onToggle} title="Collapse sidebar" className="text-zinc-400 hover:text-white transition-colors">
          <LayoutPanelLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Add Sources Button */}
      <div className="px-4 pb-4">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-nblm-panel hover:bg-[#2b2520] text-[15px] font-medium py-2.5 rounded-full border border-nblm-border transition-colors text-white"
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
            className="w-full bg-[#13171a] border border-nblm-border rounded-full py-2 pl-10 pr-3 text-[15px] focus:outline-none focus:border-nblm-text-muted placeholder-zinc-500 text-nblm-text"
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
      <div className="px-5 py-2 flex items-center justify-between text-[13px] text-zinc-400">
        <span>Select all sources</span>
        <button
          onClick={toggleAllSelection}
          className="w-5 h-5 rounded bg-nblm-panel border border-zinc-600 flex items-center justify-center transition-colors"
        >
          {selectedIds.size > 0 && selectedIds.size === sources.length && (
            <Check className="w-4 h-4 text-white" />
          )}
        </button>
      </div>

      {/* Source List */}
      <div className="flex-1 overflow-y-auto mt-2">
        {sources.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">No sources added yet.</div>
        ) : (
          <ul className="space-y-1">
            {sources.map(source => (
              <li
                key={source.id}
                onClick={() => onSourceSelect(source)}
                className="px-4 py-2.5 flex items-start gap-3 hover:bg-zinc-800/50 cursor-pointer group transition-colors"
              >
                <div className="bg-[#181511] p-2 rounded mt-0.5 border border-nblm-border">
                  {getIconForSource(source)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-nblm-text truncate font-medium">{source.title}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 capitalize">
                    Type {source.dataType} • {source.sourceType}
                  </p>
                </div>
                <button
                  onClick={(e) => toggleSelection(source.id, e)}
                  className={`w-5 h-5 rounded border flex items-center justify-center mt-1 shrink-0 transition-all ${
                    selectedIds.has(source.id)
                      ? 'bg-primary border-primary'
                      : 'bg-transparent border-zinc-600 group-hover:border-zinc-500'
                  }`}
                >
                  {selectedIds.has(source.id) && <Check className="w-4 h-4 text-white" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddSourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSourceAdded={handleSourceAdded}
      />

    </aside>
  );
}
