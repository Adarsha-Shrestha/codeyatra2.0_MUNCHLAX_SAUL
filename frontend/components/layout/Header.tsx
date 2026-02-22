import { Plus, Share2, Settings, Grid, UserCircle } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-16 flex items-center justify-between px-4 border-b border-nblm-border bg-nblm-bg shrink-0">
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden">
          <img src="/logo.png" alt="SAUL Logo" className="w-full h-full object-cover p-1" />
        </div>
        <h1 className="text-[18px] font-semibold text-nblm-text tracking-wide">
          Principles and Operations of Relational Algebra
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-[15px] font-medium hover:bg-zinc-200 transition-colors">
          <Plus className="w-5 h-5" />
          Client
        </button>
        <button className="flex items-center gap-2 bg-transparent text-nblm-text px-3 py-2 rounded-full text-[15px] font-medium hover:bg-[#2b2520] transition-colors border border-nblm-border">
          <Share2 className="w-5 h-5" />
          Share
        </button>
        <button className="flex items-center gap-2 bg-transparent text-nblm-text px-3 py-2 rounded-full text-[15px] font-medium hover:bg-nblm-panel transition-colors">
          <Settings className="w-5 h-5" />
          Settings
        </button>
        <button className="p-2 hover:bg-nblm-panel rounded-full text-zinc-400 transition-colors">
          <Grid className="w-6 h-6" />
        </button>
        <button className="p-1 hover:bg-nblm-panel rounded-full text-zinc-400 transition-colors">
          {/* Avatar Placeholder */}
          <div className="w-8 h-8 bg-zinc-700 rounded-full overflow-hidden flex items-center justify-center">
            <UserCircle className="w-7 h-7" />
          </div>
        </button>
      </div>
    </header>
  );
}
