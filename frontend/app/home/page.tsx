'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, UserCircle, Plus, Loader2 } from 'lucide-react';
import ShinyText from '@/components/ui/ShinyText';
import { useTheme } from '@/hooks/useTheme';
import { fetchClients, createClient, type BackendClient } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();
  const logoSrc = theme === 'light' ? '/logo_light.png' : '/logo.png';

  const [clients, setClients] = useState<BackendClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchClients()
      .then(data => setClients(data))
      .catch(err => console.error('Failed to load clients:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleCreateClient = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const newClient = await createClient({ client_name: name });
      setClients(prev => [newClient, ...prev]);
      setNewName('');
      setShowInput(false);
    } catch (err) {
      console.error('Failed to create client:', err);
      alert('Failed to create client');
    } finally {
      setCreating(false);
    }
  };

  const handleSelectClient = (clientId: number) => {
    router.push(`/?client=${clientId}`);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <main className="min-h-screen w-full bg-nblm-bg flex flex-col items-center relative overflow-hidden font-sans">
      {/* Top Navigation */}
      <div className="w-full p-6 flex items-center justify-between absolute top-0 left-0 z-10">
        <button className="w-10 h-10 rounded-full bg-nblm-panel border border-nblm-border flex items-center justify-center hover:bg-zinc-800 transition-colors text-nblm-text">
          <Menu className="w-5 h-5" />
        </button>
        <button className="w-10 h-10 rounded-full bg-nblm-panel border border-nblm-border flex items-center justify-center hover:bg-zinc-800 transition-colors text-nblm-text overflow-hidden">
          <UserCircle className="w-6 h-6" />
        </button>
      </div>

      {/* Central Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl px-6 pt-20">
        {/* Logo & Greeting */}
        <div className="flex flex-col items-center mb-16">
          <img
            src={logoSrc}
            alt="SAUL Logo"
            className="w-40 md:w-52 mb-4 drop-shadow-2xl"
          />
          <h1 className="text-2xl md:text-3xl font-safari tracking-wide">
            <ShinyText text="Select a Client" disabled={false} speed={3} className="text-nblm-text-muted" />
          </h1>
        </div>

        {/* Clients Section */}
        <div className="w-full flex flex-col items-center">
          <h2 className="text-4xl md:text-5xl font-safari text-nblm-text mb-8 tracking-wide">
            Clients
          </h2>

          {/* Clients Container */}
          <div className="w-full max-w-4xl bg-[#252c31] rounded-3xl p-6 md:p-8 flex items-end gap-6 shadow-2xl border border-nblm-border">

            {/* Scrollable list with fade-out mask */}
            <div className="flex-1 overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)' }}>
              <div className="flex items-center gap-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-transparent pr-20">
                {loading ? (
                  // Ghost loading skeleton
                  [1, 2, 3].map(i => (
                    <div key={i} className="shrink-0 w-36 h-48 md:w-44 md:h-56 rounded-2xl bg-nblm-panel border border-nblm-border animate-pulse flex flex-col overflow-hidden">
                      <div className="flex-1 bg-zinc-700/30" />
                      <div className="bg-nblm-bg py-3 px-2">
                        <div className="h-5 bg-zinc-700/40 rounded mx-auto w-20" />
                      </div>
                    </div>
                  ))
                ) : clients.length === 0 ? (
                  <div className="text-nblm-text-muted text-sm py-8 px-4">No clients yet. Create one to get started.</div>
                ) : (
                  clients.map((client) => (
                    <div
                      key={client.client_id}
                      onClick={() => handleSelectClient(client.client_id)}
                      className="shrink-0 w-36 h-48 md:w-44 md:h-56 bg-white overflow-hidden flex flex-col cursor-pointer transition-transform hover:-translate-y-2 rounded-2xl shadow-xl"
                    >
                      <div className="flex-1 bg-zinc-300 overflow-hidden flex items-center justify-center">
                        <span className="text-4xl font-bold text-zinc-500">{getInitials(client.client_name)}</span>
                      </div>
                      <div className="bg-[#1c2125] py-3 px-2 text-center shrink-0">
                        <p className="font-safari text-lg md:text-xl tracking-wide text-nblm-text">{client.client_name}</p>
                        <p className="text-[10px] text-nblm-text-muted mt-0.5">{client.case_count} case{client.case_count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add Client Button */}
            {showInput ? (
              <div className="shrink-0 w-36 md:w-44 flex flex-col gap-2 mb-6 ml-2">
                <input
                  type="text"
                  placeholder="Client name..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateClient(); if (e.key === 'Escape') setShowInput(false); }}
                  autoFocus
                  className="w-full bg-nblm-bg border border-nblm-border rounded-xl px-3 py-2.5 text-sm text-nblm-text focus:outline-none focus:border-zinc-500 placeholder-nblm-text-muted"
                />
                <button
                  onClick={handleCreateClient}
                  disabled={!newName.trim() || creating}
                  className="w-full bg-white text-black text-sm font-medium py-2 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create'}
                </button>
                <button
                  onClick={() => setShowInput(false)}
                  className="w-full text-nblm-text-muted text-xs py-1 hover:text-nblm-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowInput(true)}
                className="shrink-0 w-36 h-48 md:w-44 md:h-56 bg-[#a69c92] hover:bg-[#b8afa6] text-nblm-border rounded-2xl flex items-center justify-center transition-all hover:-translate-y-2 shadow-xl mb-6 ml-2 border-2 border-transparent hover:border-nblm-border"
              >
                <Plus className="w-16 h-16 stroke-1" />
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}