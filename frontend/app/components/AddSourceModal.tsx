import { useState, useRef } from 'react';
import { X, UploadCloud, FileText, Scan, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface AddSourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSourceAdded: (source: any) => void;
}

export default function AddSourceModal({ isOpen, onClose, onSourceAdded }: AddSourceModalProps) {
    const [dragActive, setDragActive] = useState(false);
    const [activeTab, setActiveTab] = useState<'upload' | 'note' | 'scan'>('upload');
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [scanContent, setScanContent] = useState('');

    const [uploading, setUploading] = useState(false);
    const [dataType, setDataType] = useState<'1' | '2' | '3'>('1');

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            await handleFileUpload(e.target.files[0]);
        }
    };

    const handleFileUpload = async (file: File) => {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sourceType', 'file');
        formData.append('dataType', dataType);
        formData.append('title', file.name);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                const data = await res.json();
                onSourceAdded(data);
                onClose();
            } else {
                alert('Failed to upload file');
            }
        } catch (error) {
            console.error(error);
            alert('Upload error');
        } finally {
            setUploading(false);
        }
    };

    const handleSaveNote = async () => {
        setUploading(true);
        const formData = new FormData();
        formData.append('sourceType', 'note');
        formData.append('dataType', dataType);
        formData.append('title', noteTitle || 'Untitled Note');
        formData.append('content', noteContent);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                const data = await res.json();
                onSourceAdded(data);
                onClose();
                setNoteTitle('');
                setNoteContent('');
            } else {
                alert('Failed to save note');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    const handleSaveScan = async () => {
        setUploading(true);
        const formData = new FormData();
        formData.append('sourceType', 'scan');
        formData.append('dataType', dataType);
        formData.append('title', 'Scanned Document');
        formData.append('content', scanContent);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                const data = await res.json();
                onSourceAdded(data);
                onClose();
                setScanContent('');
            } else {
                alert('Failed to save scan');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#202124] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-zinc-700 flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#28292c]">
                    <h2 className="text-lg font-medium text-white">Add source</h2>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded-full transition-colors text-zinc-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex border-b border-zinc-800">
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'upload' ? 'text-white border-b-2 border-primary' : 'text-zinc-400 hover:bg-zinc-800/50'}`}
                    >
                        Upload File
                    </button>
                    <button
                        onClick={() => setActiveTab('note')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'note' ? 'text-white border-b-2 border-primary' : 'text-zinc-400 hover:bg-zinc-800/50'}`}
                    >
                        Write Note
                    </button>
                    <button
                        onClick={() => setActiveTab('scan')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'scan' ? 'text-white border-b-2 border-primary' : 'text-zinc-400 hover:bg-zinc-800/50'}`}
                    >
                        Scan Document
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Common Data Type Selection */}
                    <div className="mb-6">
                        <p className="text-sm text-zinc-400 mb-2">Select Data Type:</p>
                        <div className="flex gap-3">
                            {(['1', '2', '3'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setDataType(type)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${dataType === type ? 'bg-zinc-700 border-zinc-500 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                                        }`}
                                >
                                    Type {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {activeTab === 'upload' && (
                        <div
                            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 hover:bg-zinc-800/30'
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={handleFileChange}
                                accept=".pdf,.txt,.md,.rtf"
                            />
                            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                <UploadCloud className="w-6 h-6 text-zinc-400" />
                            </div>
                            <h3 className="text-white font-medium mb-1">Drag and drop file here</h3>
                            <p className="text-sm text-zinc-400 mb-4">Files supported: PDF, TXT, MD</p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {uploading ? 'Uploading...' : 'Browse files'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'note' && (
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Note title"
                                value={noteTitle}
                                onChange={(e) => setNoteTitle(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-500"
                            />
                            <textarea
                                placeholder="Paste or type your notes here..."
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                rows={8}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500 resize-none font-mono text-sm"
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveNote}
                                    disabled={uploading || !noteContent.trim()}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {uploading ? 'Saving...' : 'Save Note'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'scan' && (
                        <div className="space-y-4">
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-3 text-blue-200">
                                <Scan className="w-5 h-5 shrink-0" />
                                <p className="text-sm">Simulate a document scan by pasting OCR text below. In a full app, this would use the device camera and OCR libraries.</p>
                            </div>
                            <textarea
                                placeholder="Simulated scanned text..."
                                value={scanContent}
                                onChange={(e) => setScanContent(e.target.value)}
                                rows={8}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500 resize-none font-mono text-sm"
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveScan}
                                    disabled={uploading || !scanContent.trim()}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {uploading ? 'Saving...' : 'Save Scan'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
