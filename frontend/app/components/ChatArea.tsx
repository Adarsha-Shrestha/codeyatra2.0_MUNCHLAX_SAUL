import { useState, useEffect } from 'react';
import { Settings2, MoreVertical, ThumbsUp, ThumbsDown, Copy, ArrowUp, X, PanelLeft, PanelRight, Link as LinkIcon } from 'lucide-react';
import { SourceInfo } from './SidebarLeft';

interface ChatAreaProps {
    activeSource?: string | SourceInfo | null;
    onClearSource?: () => void;
    leftOpen?: boolean;
    rightOpen?: boolean;
    onToggleLeft?: () => void;
    onToggleRight?: () => void;
}

export default function ChatArea({ activeSource, onClearSource, leftOpen, rightOpen, onToggleLeft, onToggleRight }: ChatAreaProps) {
    const [textContent, setTextContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (typeof activeSource !== 'string' && activeSource?.fileType.includes('text')) {
            fetch(activeSource.url)
                .then(res => res.text())
                .then(text => setTextContent(text))
                .catch(err => console.error("Failed to load text:", err));
        }
    }, [activeSource]);

    const handleSaveText = async () => {
        if (typeof activeSource === 'string' || !activeSource) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/sources', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: activeSource.id, content: textContent }),
            });
            if (!res.ok) throw new Error('Failed to save');
            alert('Saved successfully!');
        } catch (error) {
            console.error('Save error:', error);
            alert('Error saving document');
        } finally {
            setIsSaving(false);
        }
    };

    if (activeSource) {
        const isString = typeof activeSource === 'string';
        const sourceObj = !isString ? (activeSource as SourceInfo) : null;
        const title = isString ? activeSource : sourceObj?.title;
        const isText = sourceObj && sourceObj.fileType.includes('text');
        const isPdf = sourceObj && sourceObj.fileType.includes('pdf');

        return (
            <div className="flex-1 flex flex-col bg-nblm-panel h-full relative overflow-hidden">
                <div className="p-4 flex items-center justify-between border-b border-nblm-border shrink-0 bg-nblm-panel sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onToggleLeft}
                            title={leftOpen ? 'Collapse sources' : 'Expand sources'}
                            className={`hidden md:flex hover:text-white transition-colors p-1 ${leftOpen ? 'text-zinc-400' : 'text-white'}`}
                        >
                            <PanelLeft className="w-4 h-4" />
                        </button>
                        <h2 className="text-[13px] font-medium text-zinc-400 tracking-wide flex items-center gap-2 truncate max-w-[200px] md:max-w-md">
                            <span className="truncate">{title}</span>
                            {!isString && sourceObj && (
                                <span className="bg-zinc-800 text-[10px] px-1.5 py-0.5 rounded text-zinc-500 uppercase tracking-wider shrink-0">
                                    Type {sourceObj.dataType}
                                </span>
                            )}
                        </h2>
                    </div>
                    <div className="flex gap-2 items-center">
                        {isText && (
                            <button
                                onClick={handleSaveText}
                                disabled={isSaving}
                                className="bg-primary hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Save Edits'}
                            </button>
                        )}
                        <button onClick={onClearSource} title="Close source view" className="hover:text-white text-zinc-400 transition-colors p-1 ml-2">
                            <X className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onToggleRight}
                            title={rightOpen ? 'Collapse contents' : 'Expand contents'}
                            className={`hidden md:flex hover:text-white transition-colors p-1 ${rightOpen ? 'text-zinc-400' : 'text-white'}`}
                        >
                            <PanelRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className={`flex-1 overflow-hidden flex flex-col ${isPdf ? '' : 'p-6 md:p-8'}`}>
                    {isString ? (
                        <>
                            <h1 className="text-2xl font-bold text-white mb-6 border-b border-nblm-border pb-4 w-full md:max-w-4xl mx-auto">{activeSource}</h1>
                            <p className="text-zinc-300 leading-relaxed md:max-w-4xl mx-auto text-sm md:text-base">
                                This is a simulated view of the source material for the section: "{activeSource}".
                                In a full implementation, the actual markdown content for this section would be parsed and rendered here,
                                allowing the user to read the source document seamlessly.
                            </p>
                        </>
                    ) : isText ? (
                        <textarea
                            className="w-full h-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-zinc-300 font-mono text-sm md:text-base resize-none focus:outline-none focus:border-zinc-700 leading-relaxed max-w-5xl mx-auto"
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value)}
                            placeholder="Type to edit this document..."
                        />
                    ) : isPdf ? (
                        <iframe
                            src={sourceObj!.url}
                            className="w-full h-full border-none bg-zinc-900"
                            title={title}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                            <LinkIcon className="w-12 h-12 mb-4 opacity-50" />
                            <p>Cannot preview this file type natively.</p>
                            <a href={sourceObj!.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline mt-2 text-sm">Download File</a>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-nblm-panel h-full relative overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-nblm-border shrink-0 bg-nblm-panel sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    {/* Left sidebar toggle — shown in chat header when on desktop */}
                    <button
                        onClick={onToggleLeft}
                        title={leftOpen ? 'Collapse sources' : 'Expand sources'}
                        className={`hidden md:flex hover:text-white transition-colors p-1 ${leftOpen ? 'text-zinc-400' : 'text-white'}`}
                    >
                        <PanelLeft className="w-4 h-4" />
                    </button>
                    <h2 className="text-[13px] font-medium text-zinc-400 tracking-wide">Chat</h2>
                </div>
                <div className="flex gap-2 text-zinc-400 items-center">
                    <button className="hover:text-white transition-colors p-1"><Settings2 className="w-4 h-4" /></button>
                    <button className="hover:text-white transition-colors p-1"><MoreVertical className="w-4 h-4" /></button>
                    {/* Right sidebar toggle */}
                    <button
                        onClick={onToggleRight}
                        title={rightOpen ? 'Collapse contents' : 'Expand contents'}
                        className={`hidden md:flex hover:text-white transition-colors p-1 ${rightOpen ? 'text-zinc-400' : 'text-white'}`}
                    >
                        <PanelRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 pb-40 scroll-smooth">
                <div className="text-[14px] leading-relaxed text-zinc-300 max-w-3xl mx-auto space-y-4">
                    <p>
                        • ÷ (Division): Used for queries involving the phrase "for all," acting essentially as the inverse of the Cartesian product <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-700 text-[10px] text-zinc-300 ml-1">3</span> .
                    </p>
                    <p>
                        • ⟕ (Left Outer Join): Includes all matching tuples from both relations plus unmatched tuples from the left relation padded with nulls <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-700 text-[10px] text-zinc-300 ml-1">11</span> <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-700 text-[10px] text-zinc-300">12</span> .
                    </p>
                    <p>
                        • ⟖ (Right Outer Join): Includes all matching tuples from both relations plus unmatched tuples from the right relation padded with nulls <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-700 text-[10px] text-zinc-300 ml-1">13</span> .
                    </p>
                    <p>
                        • ⟗ (Full Outer Join): Includes matching tuples from both relations and all unmatched tuples from both sides padded with nulls <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-700 text-[10px] text-zinc-300 ml-1">14</span> <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-700 text-[10px] text-zinc-300">15</span> .
                    </p>
                    <p>
                        • ρ (Rename): Used to provide a name to the result of a relational algebraic expression or to rename specific attributes <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-700 text-[10px] text-zinc-300 ml-1">16</span> .
                    </p>
                    <p>
                        • ← (Assignment): Assigns temporary names to intermediate query results to make complex expressions easier to understand <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-700 text-[10px] text-zinc-300 ml-1">17</span> .
                    </p>
                    <p>
                        • πF1,F2... (Generalized Projection): An enhanced version of projection that allows for arithmetic functions within the selection list <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-700 text-[10px] text-zinc-300 ml-1">8</span> .
                    </p>
                    <p>
                        • 𝓖 (Aggregate Functions): Performs mathematical calculations (like Sum, Avg, or Count) on a set of values to return a single result <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-700 text-[10px] text-zinc-300 ml-1">18</span> <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-700 text-[10px] text-zinc-300">19</span> .
                    </p>

                    <div className="my-6 border-b border-dashed border-zinc-600"></div>

                    <p>
                        <strong>Analogy:</strong> Think of relational algebra symbols as <strong>tools in a specialized workshop</strong>. The <strong>Selection (σ)</strong> tool acts like a <span className="border-b border-zinc-500">sieve</span> that only lets through items of a certain size (rows), while the <strong>Projection (π)</strong> tool acts like a <span className="border-b border-zinc-500">mask</span> that only shows you specific parts (columns) of an object. The <strong>Join (⋈)</strong> symbols are like <strong>industrial glue</strong> that connects different parts together only where they perfectly fit.
                    </p>

                    <div className="flex items-center gap-3 mt-4">
                        <button className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded text-xs font-medium hover:bg-zinc-700 transition-colors">
                            <Copy className="w-3.5 h-3.5" /> Save to note
                        </button>
                        <button className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 transition-colors">
                            <Copy className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 transition-colors">
                            <ThumbsUp className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 transition-colors">
                            <ThumbsDown className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-nblm-panel via-nblm-panel to-transparent pt-10 pb-6 px-10">
                <div className="max-w-3xl mx-auto">
                    <p className="text-[11px] text-zinc-500 text-center mb-4">Today • 7:17 PM</p>
                    <div className="relative bg-[#323236] rounded-2xl border border-nblm-border overflow-hidden focus-within:ring-1 focus-within:ring-nblm-border focus-within:border-nblm-border transition-all">
                        <textarea
                            placeholder="Start typing..."
                            className="w-full bg-transparent text-white px-4 py-4 min-h-[56px] resize-none focus:outline-none text-[15px] placeholder-zinc-500"
                            rows={1}
                        />
                        <div className="absolute right-2 bottom-2 flex items-center gap-3">
                            <div className="text-xs text-zinc-500 font-medium tracking-wide">4 sources</div>
                            <button className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition-colors">
                                <ArrowUp className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 text-center mt-3">
                        NotebookLM can be inaccurate; please double check its responses.
                    </p>
                </div>
            </div>
        </div>
    );
}
