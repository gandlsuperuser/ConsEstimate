'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RESIDENTIAL_CATEGORIES } from '@/types';

// SpeechRecognition type declarations for browser support
interface SpeechRecognitionEventLike {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface VoiceExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  onExpenseSaved?: () => void;
}

export default function VoiceExpenseModal({
  isOpen,
  onClose,
  defaultProjectId,
  onExpenseSaved,
}: VoiceExpenseModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Parsed Form Fields
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId || '');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('Other');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [hasParsed, setHasParsed] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Fetch available projects
  useEffect(() => {
    if (!isOpen) return;
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        if (data.projects) {
          setProjects(data.projects);
          if (!selectedProjectId && data.projects.length > 0) {
            setSelectedProjectId(defaultProjectId || data.projects[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    };
    fetchProjects();
  }, [isOpen, defaultProjectId, selectedProjectId]);

  const handleParse = useCallback(async (textToParse: string) => {
    if (!textToParse.trim()) return;
    setParsing(true);

    try {
      const res = await fetch('/api/expenses/voice-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: textToParse,
          defaultProjectId: selectedProjectId || defaultProjectId,
        }),
      });

      const json = await res.json();
      if (json.data) {
        const d = json.data;
        if (d.project_id) setSelectedProjectId(d.project_id);
        if (d.vendor) setVendor(d.vendor);
        if (d.amount) setAmount(String(d.amount));
        if (d.category) setCategory(d.category);
        if (d.expense_date) setExpenseDate(d.expense_date);
        if (d.notes) setNotes(d.notes);
        setHasParsed(true);
      }
    } catch (err) {
      console.error('Error parsing voice transcript:', err);
    } finally {
      setParsing(false);
    }
  }, [selectedProjectId, defaultProjectId]);

  // Setup Web Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: unknown) => {
      console.warn('Speech recognition error:', event);
      setIsListening(false);
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let currentTranscript = '';
      for (let i = 0; i < Object.keys(event.results).length; i++) {
        const item = event.results[i];
        if (item && item[0]) {
          currentTranscript += item[0].transcript + ' ';
        }
      }
      setTranscript(currentTranscript.trim());
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      if (transcript) {
        handleParse(transcript);
      }
    } else {
      setTranscript('');
      setHasParsed(false);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !vendor || !amount) {
      alert('Please fill in Project, Vendor, and Amount.');
      return;
    }

    setSaving(true);

    try {
      let receiptUrl: string | null = null;

      if (receiptFile) {
        const formData = new FormData();
        formData.append('file', receiptFile);
        formData.append('projectId', selectedProjectId);

        const uploadRes = await fetch('/api/expenses/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok) {
          receiptUrl = uploadData.receiptUrl;
        }
      }

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectId,
          vendor: vendor.trim(),
          amount: parseFloat(amount),
          category,
          expense_date: expenseDate,
          notes: notes.trim() || transcript,
          receipt_url: receiptUrl,
          scan_confidence: 'high',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save expense');
      }

      onExpenseSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error saving expense');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center text-xl">
              🎙️
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Voice Expense Logger</h3>
              <p className="text-xs text-indigo-200/80">Speak naturally to log any project expense</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-indigo-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Microphone Record Station */}
          <div className="flex flex-col items-center justify-center py-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-center">
            {speechSupported ? (
              <>
                <div className="relative mb-3">
                  {isListening && (
                    <>
                      <div className="absolute -inset-3 rounded-full bg-rose-500/20 animate-ping"></div>
                      <div className="absolute -inset-6 rounded-full bg-rose-500/10 animate-pulse"></div>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg transition-all duration-300 ${
                      isListening
                        ? 'bg-rose-600 text-white shadow-rose-600/40 scale-105'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 hover:scale-105'
                    }`}
                  >
                    {isListening ? (
                      <span className="animate-pulse">⏹</span>
                    ) : (
                      <span>🎙️</span>
                    )}
                  </button>
                </div>

                <p className="text-sm font-bold text-slate-800">
                  {isListening ? 'Listening... Speak now' : 'Tap to start speaking'}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {isListening
                    ? 'Say project, vendor, amount, or what you bought (e.g. "Humana project $250 for lock change")'
                    : 'Tap microphone, dictate your expense, and tap stop to parse'}
                </p>
              </>
            ) : (
              <div className="text-amber-700 bg-amber-50 p-3 rounded-xl text-xs">
                Microphone speech recognition is not supported in this browser. You can type your expense description below to auto-parse it with AI.
              </div>
            )}

            {/* Live Transcript / Input Area */}
            <div className="w-full mt-4">
              <div className="relative">
                <textarea
                  rows={2}
                  placeholder="Or type/edit transcript here... e.g. Humana Jourdanton, paid Zachary Barksdale $250 for lock change"
                  value={transcript}
                  onChange={(e) => {
                    setTranscript(e.target.value);
                  }}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
                {transcript && !isListening && (
                  <button
                    type="button"
                    onClick={() => handleParse(transcript)}
                    disabled={parsing}
                    className="absolute right-2 bottom-3 px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors flex items-center gap-1"
                  >
                    {parsing ? '⚡ Parsing...' : '⚡ Parse with AI'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* AI Extraction Form Preview */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span>🤖</span> Extracted Expense Details
              </h4>
              {hasParsed && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                  ✓ Auto-Extracted
                </span>
              )}
            </div>

            {/* Project Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                required
              >
                <option value="" disabled>Select a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vendor / Payee <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zachary Barksdale"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount ($) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {RESIDENTIAL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expense Date
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Changed locks for Conviva / Humana"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Optional file attachment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Attach Receipt Photo / PDF (Optional)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>

            {/* Save Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || parsing}
                className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving Expense...</span>
                  </>
                ) : (
                  <span>✓ Save & Log Expense</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
