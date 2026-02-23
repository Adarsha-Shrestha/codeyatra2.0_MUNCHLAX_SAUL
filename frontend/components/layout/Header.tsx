'use client';

import { useState } from 'react';
import { Plus, Share2, Grid, UserCircle, Sun, Moon, ChevronDown, Loader2, Check } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import type { HeaderProps } from '@/types';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';


export default function Header({
  cases, selectedCaseId, onCaseChange, isLoading,
  clients, selectedClientId, onClientChange, onCreateClient, clientsLoading,
}: HeaderProps) {
  const { theme, toggle } = useTheme();
  const [showNewClientInput, setShowNewClientInput] = useState(false);
  const [newClientName, setNewClientName] = useState('');

  const selectedCase = cases.find(c => c.case_id === selectedCaseId);
  const selectedClient = clients.find(c => c.client_id === selectedClientId);

  // Group cases by client
  const clientGroups: Record<string, typeof cases> = {};
  for (const c of cases) {
    const key = c.client_name || 'Unknown';
    if (!clientGroups[key]) clientGroups[key] = [];
    clientGroups[key].push(c);
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleNewClientSubmit = () => {
    const name = newClientName.trim();
    if (!name) return;
    onCreateClient(name);
    setNewClientName('');
    setShowNewClientInput(false);
  };

  return (
    <header className="h-16 flex items-center justify-between px-3 sm:px-4 border-b border-nblm-border bg-nblm-bg shrink-0 min-w-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
        {/* Logo */}
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center overflow-hidden shrink-0">
          <img src={theme === 'light' ? '/logo_light.png' : '/logo.png'} alt="SAUL Logo" className="w-full h-full object-cover p-1" />
        </div>

        {/* Case Dropdown */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-nblm-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[15px]">Loading cases...</span>
          </div>
        ) : cases.length === 0 ? (
          <h1 className="text-[15px] sm:text-[18px] font-semibold text-nblm-text-muted tracking-wide truncate">
            No cases available
          </h1>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-[15px] sm:text-[18px] font-semibold text-nblm-text tracking-wide truncate flex items-center gap-2 hover:text-white transition-colors max-w-sm">
                <span className="truncate">
                  {selectedCase
                    ? (selectedCase.description || `Case #${selectedCase.case_id}`)
                    : 'Select a case'}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0 text-nblm-text-muted" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto w-72">
              {Object.entries(clientGroups).map(([clientName, clientCases], gi) => (
                <div key={clientName}>
                  {gi > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel>{clientName}</DropdownMenuLabel>
                  {clientCases.map(c => (
                    <DropdownMenuItem
                      key={c.case_id}
                      onClick={() => onCaseChange(c.case_id)}
                      className={selectedCaseId === c.case_id ? 'bg-nblm-panel' : ''}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{c.description || `Case #${c.case_id}`}</span>
                        <span className="text-[10px] text-nblm-text-muted">{c.file_count} files</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        {/* Create Client Button */}
        <DropdownMenu open={showNewClientInput ? true : undefined} onOpenChange={(open) => { if (!open) setShowNewClientInput(false); }}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 bg-white text-black px-3 sm:px-4 py-2 rounded-full text-[13px] sm:text-[15px] font-medium hover:bg-zinc-200 transition-colors">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Client</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>New Client</DropdownMenuLabel>
            <div className="px-2 pb-2">
              <input
                type="text"
                placeholder="Client name..."
                value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleNewClientSubmit(); }}
                autoFocus
                className="w-full bg-nblm-bg border border-nblm-border rounded-lg px-3 py-1.5 text-sm text-nblm-text focus:outline-none focus:border-nblm-text-muted placeholder-nblm-text-muted"
              />
              <button
                onClick={handleNewClientSubmit}
                disabled={!newClientName.trim()}
                className="mt-2 w-full bg-white text-black text-sm font-medium py-1.5 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <button className="flex items-center gap-2 bg-transparent text-nblm-text px-2 sm:px-3 py-2 rounded-full text-[13px] sm:text-[15px] font-medium hover:bg-nblm-panel transition-colors border border-nblm-border">
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <button className="hidden sm:flex p-2 hover:bg-nblm-panel rounded-full text-zinc-400 transition-colors">
          <Grid className="w-6 h-6" />
        </button>
        <button onClick={toggle} className="flex p-2 hover:bg-nblm-panel rounded-full text-nblm-text transition-colors" aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Client Switcher Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-0.5 hover:bg-nblm-panel rounded-full transition-colors group">
              <div className="w-8 h-8 bg-zinc-700 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-bold text-zinc-200 tracking-wide">
                {selectedClient ? getInitials(selectedClient.client_name) : <UserCircle className="w-7 h-7 text-zinc-400" />}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-72 overflow-y-auto">
            <DropdownMenuLabel>Switch Client</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {clientsLoading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-nblm-text-muted" />
              </div>
            ) : clients.length === 0 ? (
              <div className="px-2 py-3 text-sm text-zinc-500 text-center">No clients yet</div>
            ) : (
              clients.map(c => (
                <DropdownMenuItem
                  key={c.client_id}
                  onClick={() => onClientChange(c.client_id)}
                  className={selectedClientId === c.client_id ? 'bg-nblm-panel' : ''}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-7 h-7 bg-zinc-600 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-200 shrink-0">
                      {getInitials(c.client_name)}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate text-sm">{c.client_name}</span>
                      <span className="text-[10px] text-nblm-text-muted">{c.case_count} case{c.case_count !== 1 ? 's' : ''}</span>
                    </div>
                    {selectedClientId === c.client_id && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
