import { Plus, Share2, Grid, UserCircle } from 'lucide-react';


export default function Header() {
  return (
    <header className="h-16 flex items-center justify-between px-3 sm:px-4 border-b border-nblm-border bg-nblm-bg shrink-0 min-w-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
        {/* Logo */}
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center overflow-hidden shrink-0">
          <img src="/logo.png" alt="SAUL Logo" className="w-full h-full object-cover p-1" />
        </div>
        <h1 className="text-[15px] sm:text-[18px] font-semibold text-nblm-text tracking-wide truncate">
          Principles and Operations of Relational Algebra
        </h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        <button className="flex items-center gap-2 bg-white text-black px-3 sm:px-4 py-2 rounded-full text-[13px] sm:text-[15px] font-medium hover:bg-zinc-200 transition-colors">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Client</span>
        </button>
        <button className="flex items-center gap-2 bg-transparent text-nblm-text px-2 sm:px-3 py-2 rounded-full text-[13px] sm:text-[15px] font-medium hover:bg-[#2b2520] transition-colors border border-nblm-border">
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <button className="hidden sm:flex p-2 hover:bg-nblm-panel rounded-full text-zinc-400 transition-colors">
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
