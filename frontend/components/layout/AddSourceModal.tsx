'use client';

import { useState, useRef } from 'react';
import { X, UploadCloud, Scan } from 'lucide-react';
import type { AddSourceModalProps, SourceInfo } from '@/types';
import { uploadCaseFile, getCaseFileDownloadUrl } from '@/lib/api';

export default function AddSourceModal({ isOpen, onClose, onSourceAdded, caseId }: AddSourceModalProps) {
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
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) await handleFileUpload(e.dataTransfer.files[0]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files?.[0]) await handleFileUpload(e.target.files[0]);
  };

  const handleFileUpload = async (file: File) => {
    if (!caseId) { alert('Please select a case first'); return; }
    setUploading(true);
    try {
      const result = await uploadCaseFile(caseId, file);
      const newSource: SourceInfo = {
        id: result.file_id?.toString() ?? Date.now().toString(),
        title: result.filename,
        sourceType: 'file',
        dataType,
        fileType: file.type || 'application/octet-stream',
        url: result.file_id ? getCaseFileDownloadUrl(result.file_id) : '',
        createdAt: new Date().toISOString(),
        status: 'processing',
      };
      onSourceAdded(newSource);
      onClose();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Upload error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!caseId) { alert('Please select a case first'); return; }
    setUploading(true);
    try {
      // Create a text file from the note content and upload it
      const blob = new Blob([noteContent], { type: 'text/plain' });
      const fileName = (noteTitle || 'Untitled Note') + '.txt';
      const file = new File([blob], fileName, { type: 'text/plain' });
      const result = await uploadCaseFile(caseId, file);
      const newSource: SourceInfo = {
        id: result.file_id?.toString() ?? Date.now().toString(),
        title: fileName,
        sourceType: 'note',
        dataType,
        fileType: 'text/plain',
        url: result.file_id ? getCaseFileDownloadUrl(result.file_id) : '',
        createdAt: new Date().toISOString(),
        status: 'processing',
      };
      onSourceAdded(newSource);
      onClose();
      setNoteTitle('');
      setNoteContent('');
    } catch (error) {
      console.error(error);
      alert('Failed to save note');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveScan = async () => {
    if (!caseId) { alert('Please select a case first'); return; }
    setUploading(true);
    try {
      const blob = new Blob([scanContent], { type: 'text/plain' });
      const file = new File([blob], 'Scanned_Document.txt', { type: 'text/plain' });
      const result = await uploadCaseFile(caseId, file);
      const newSource: SourceInfo = {
        id: result.file_id?.toString() ?? Date.now().toString(),
        title: 'Scanned Document',
        sourceType: 'scan',
        dataType,
        fileType: 'text/plain',
        url: result.file_id ? getCaseFileDownloadUrl(result.file_id) : '',
        createdAt: new Date().toISOString(),
        status: 'processing',
      };
      onSourceAdded(newSource);
      onClose();
      setScanContent('');
    } catch (error) {
      console.error(error);
      alert('Failed to save scan');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#202124] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-zinc-700 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#28292c]">
          <h2 className="text-lg font-medium text-white">Add source</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded-full transition-colors text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          {(['upload', 'note', 'scan'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab
                ? 'text-white border-b-2 border-primary'
                : 'text-zinc-400 hover:bg-zinc-800/50'}`}
            >
              {tab === 'upload' ? 'Upload File' : tab === 'note' ? 'Write Note' : 'Scan Document'}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Data Type Selector */}
          <div className="mb-6">
            <p className="text-sm text-zinc-400 mb-2">Select Data Type:</p>
            <div className="flex gap-3">
              {(['1', '2', '3'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setDataType(type)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${dataType === type
                    ? 'bg-zinc-700 border-zinc-500 text-white'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                >
                  Type {type}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 hover:bg-zinc-800/30'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.txt,.md,.rtf" />
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

          {/* Note Tab */}
          {activeTab === 'note' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Note title"
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-500"
              />
              <textarea
                placeholder="Paste or type your notes here..."
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
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

          {/* Scan Tab */}
          {activeTab === 'scan' && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-3 text-blue-200">
                <Scan className="w-5 h-5 shrink-0" />
                <p className="text-sm">Simulate a document scan by pasting OCR text below.</p>
              </div>
              <textarea
                placeholder="Simulated scanned text..."
                value={scanContent}
                onChange={e => setScanContent(e.target.value)}
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
