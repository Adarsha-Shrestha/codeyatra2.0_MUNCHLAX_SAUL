import { Plus, Share2, Settings, Grid, UserCircle, Menu } from 'lucide-react';

export default function Header() {
    return (
        <header className="h-14 flex items-center justify-between px-4 border-b border-nblm-border bg-nblm-bg shrink-0">
            <div className="flex items-center gap-3">
                {/* Logo placeholder */}
                <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
                    <Menu className="w-4 h-4 text-zinc-300" />
                </div>
                <h1 className="text-[15px] font-medium text-nblm-text tracking-wide">
                    Principles and Operations of Relational Algebra
                </h1>
            </div>

            <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 bg-white text-black px-4 py-1.5 rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors">
                    <Plus className="w-4 h-4" />
                    Client
                </button>
                <button className="flex items-center gap-2 bg-nblm-panel text-nblm-text px-3 py-1.5 rounded-full text-sm font-medium hover:bg-zinc-700 transition-colors border border-nblm-border">
                    <Share2 className="w-4 h-4" />
                    Share
                </button>
                <button className="flex items-center gap-2 bg-transparent text-nblm-text px-3 py-1.5 rounded-full text-sm font-medium hover:bg-nblm-panel transition-colors">
                    <Settings className="w-4 h-4" />
                    Settings
                </button>
                <button className="p-2 hover:bg-nblm-panel rounded-full text-zinc-400 transition-colors">
                    <Grid className="w-5 h-5" />
                </button>
                <button className="p-1 hover:bg-nblm-panel rounded-full text-zinc-400 transition-colors">
                    {/* Avatar Placeholder */}
                    <div className="w-7 h-7 bg-zinc-700 rounded-full overflow-hidden flex items-center justify-center">
                        <UserCircle className="w-6 h-6" />
                    </div>
                </button>
            </div>
        </header>
    );
}
