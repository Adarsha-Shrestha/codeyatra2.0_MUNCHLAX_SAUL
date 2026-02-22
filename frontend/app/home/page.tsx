'use client';

import { Menu, UserCircle, Plus } from 'lucide-react';
import ShinyText from '../components/ShinyText';

const MOCK_CLIENTS = [
  { id: '1', name: 'Rohan .S', img: 'https://i.pravatar.cc/150?u=1' },
  { id: '2', name: 'Shailaj .D', img: 'https://i.pravatar.cc/150?u=2' },
  { id: '3', name: 'Niraj .N', img: 'https://i.pravatar.cc/150?u=3' },
  { id: '4', name: 'Adarsha .S', img: 'https://i.pravatar.cc/150?u=4' },
  { id: '5', name: 'Alice .K', img: 'https://i.pravatar.cc/150?u=5' },
  { id: '6', name: 'Bob .M', img: 'https://i.pravatar.cc/150?u=6' },
];

export default function Home() {
  const userName = "Rohan";

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
            src="/logo.png"
            alt="SAUL Logo"
            className="w-40 md:w-52 mb-4 drop-shadow-2xl"
          />
          <h1 className="text-2xl md:text-3xl font-safari tracking-wide">
            <ShinyText text={`Good Afternoon, ${userName}`} disabled={false} speed={3} className="text-nblm-text-muted" />
          </h1>
        </div>

        {/* Clients Section */}
        <div className="w-full flex flex-col items-center">
          <h2 className="text-4xl md:text-5xl font-safari text-nblm-text mb-8 tracking-wide">
            Clients
          </h2>

          {/* Clients Container */}
          <div className="w-full max-w-4xl bg-[#292621] rounded-3xl p-6 md:p-8 flex items-end gap-6 shadow-2xl border border-nblm-border">

            {/* Scrollable list with fade-out mask */}
            <div className="flex-1 overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)' }}>
              <div className="flex items-center gap-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-transparent pr-20">
                {MOCK_CLIENTS.map((client) => (
                  <div
                    key={client.id}
                    className="shrink-0 w-36 h-48 md:w-44 md:h-56 bg-white overflow-hidden flex flex-col cursor-pointer transition-transform hover:-translate-y-2 rounded-2xl shadow-xl"
                  >
                    <div className="flex-1 bg-zinc-200 overflow-hidden">
                      <img
                        src={client.img}
                        alt={client.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="bg-[#4a4742] py-3 px-2 text-center shrink-0">
                      <p className="font-safari text-nblm-text text-lg md:text-xl tracking-wide">{client.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Static Add Button at the end */}
            <button className="shrink-0 w-36 h-48 md:w-44 md:h-56 bg-[#a69c92] hover:bg-[#b8afa6] text-nblm-border rounded-2xl flex items-center justify-center transition-all hover:-translate-y-2 shadow-xl mb-6 ml-2 border-2 border-transparent hover:border-nblm-border">
              <Plus className="w-16 h-16 stroke-1" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}