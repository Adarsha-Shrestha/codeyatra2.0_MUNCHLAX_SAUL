import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function RedirectPage() {
    return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-nblm-bg text-nblm-text font-sans">
            <div className="flex flex-col items-center gap-6 max-w-sm text-center">
                {/* NotebookLM Logo Placeholder */}
                <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 shadow-xl shadow-black/20 mb-4 animate-pulse">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>

                <h1 className="text-xl font-medium tracking-tight">Loading Notebook...</h1>
                <p className="text-sm text-zinc-400">
                    Gathering your sources and preparing the studio environment.
                </p>

                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-4">
                    <div className="h-full bg-white w-1/3 rounded-full animate-[progress_2s_ease-in-out_infinite]"></div>
                </div>

                <Link href="/" className="mt-8 text-xs text-nblm-accent hover:underline opacity-80 transition-opacity hover:opacity-100">
                    Return Home (Simulation)
                </Link>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(300%); }
        }
      `}} />
        </div>
    );
}
