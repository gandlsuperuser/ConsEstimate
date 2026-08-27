'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { ProjectDrawing, DrawingMarkup } from '@/types';

export default function DrawingsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [drawings, setDrawings] = useState<ProjectDrawing[]>([]);
  const [selectedDrawing, setSelectedDrawing] = useState<ProjectDrawing | null>(null);
  const [markups, setMarkups] = useState<DrawingMarkup[]>([]);
  const [activeTool, setActiveTool] = useState<'cloud' | 'arrow' | 'callout' | 'measurement' | 'rfi_pin' | 'obs_pin'>('cloud');
  const [markupText, setMarkupText] = useState('Verify dimensions');
  const [loading, setLoading] = useState(true);
  const [isNewSheetModal, setIsNewSheetModal] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  const [sheetForm, setSheetForm] = useState({
    drawing_number: 'M-201',
    title: 'Mechanical Roof Plan & Equipment Schedule',
    discipline: 'Mechanical' as ProjectDrawing['discipline'],
    revision_number: '1',
  });

  const fetchDrawings = async () => {
    try {
      const res = await fetch(`/api/drawings?projectId=${projectId}`);
      const data = await res.json();
      const list = data.drawings || [];
      if (list.length === 0) {
        // Initial sample drawings if none exist
        const defaultDrawing: ProjectDrawing = {
          id: 'drw-m201',
          project_id: projectId,
          drawing_number: 'M-201',
          title: 'Roof Mechanical Layout & RTU-1 Penetrations',
          discipline: 'Mechanical',
          revision_number: 'R1',
          set_date: new Date().toISOString().split('T')[0],
          markups_count: 2,
        };
        setDrawings([defaultDrawing]);
        setSelectedDrawing(defaultDrawing);
        setMarkups([
          {
            id: 'm1',
            drawing_id: defaultDrawing.id,
            markup_type: 'rfi_pin',
            x: 48,
            y: 35,
            text: 'RFI-042: 54"x72" Curb Opening Confirmation',
            color: '#F47E20',
            author_name: 'Mo Li (PM)',
          },
          {
            id: 'm2',
            drawing_id: defaultDrawing.id,
            markup_type: 'cloud',
            x: 65,
            y: 55,
            text: 'Vibration isolator spring pads location',
            color: '#1565C0',
            author_name: 'Robert Mason (Superintendent)',
          }
        ]);
      } else {
        setDrawings(list);
        setSelectedDrawing(list[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrawings();
  }, [projectId]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !selectedDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const newMarkup: DrawingMarkup = {
      id: `mk-${Date.now()}`,
      drawing_id: selectedDrawing.id,
      markup_type: activeTool,
      x,
      y,
      text: markupText,
      color: activeTool === 'rfi_pin' ? '#F47E20' : activeTool === 'obs_pin' ? '#D32F2F' : '#1565C0',
      author_name: 'Mo Li (PM)',
    };

    setMarkups([...markups, newMarkup]);
  };

  const handleCreateSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sheetForm, project_id: projectId }),
      });
      if (res.ok) {
        setIsNewSheetModal(false);
        await fetchDrawings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-procore-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-procore-text tracking-tight">Drawings & Document 2D Markup</h1>
            <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
              Phase 5: Plan Viewer
            </span>
          </div>
          <p className="text-xs text-procore-text-muted mt-0.5">
            Interactive plan viewer with revisions, cloud callouts, scale measurements, and direct RFI pinning.
          </p>
        </div>

        <button
          onClick={() => setIsNewSheetModal(true)}
          className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span>+</span> Upload Drawing Sheet
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Drawings Sheet Directory Sidebar */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-procore-text-muted px-1">
            Drawing Sheets ({drawings.length})
          </h2>
          {drawings.map((drw) => {
            const isSelected = selectedDrawing?.id === drw.id;
            return (
              <div
                key={drw.id}
                onClick={() => setSelectedDrawing(drw)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white border-procore-orange shadow-sm ring-1 ring-procore-orange'
                    : 'bg-white border-procore-border hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-procore-orange">{drw.drawing_number}</span>
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                    Rev {drw.revision_number}
                  </span>
                </div>
                <h3 className="font-bold text-xs text-procore-text mt-1">{drw.title}</h3>
                <div className="flex items-center justify-between text-[10px] text-procore-text-muted mt-2 pt-1 border-t border-procore-border-light">
                  <span>{drw.discipline}</span>
                  <span>{markups.filter(m => m.drawing_id === drw.id).length} markups</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive 2D Canvas & Markup Toolbar */}
        <div className="lg:col-span-9 space-y-3">
          {/* Tool Palette */}
          <div className="bg-white p-3 rounded-lg border border-procore-border shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'cloud', label: '☁️ Cloud' },
                { id: 'arrow', label: '↗️ Arrow' },
                { id: 'callout', label: '💬 Callout' },
                { id: 'measurement', label: '📐 Scale Dim' },
                { id: 'rfi_pin', label: '📍 Pin RFI' },
                { id: 'obs_pin', label: '⚠️ Pin Issue' },
              ].map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id as any)}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    activeTool === tool.id
                      ? 'bg-procore-orange text-white shadow-2xs'
                      : 'bg-gray-100 text-procore-text-secondary hover:bg-gray-200'
                  }`}
                >
                  {tool.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={markupText}
                onChange={(e) => setMarkupText(e.target.value)}
                placeholder="Annotation text..."
                className="text-xs border border-procore-border px-2.5 py-1 rounded w-48 focus:border-procore-orange"
              />
              <button
                onClick={() => setMarkups([])}
                className="text-xs text-procore-text-muted hover:text-red-600 font-semibold px-2"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Blueprint Canvas View */}
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="relative w-full h-[520px] bg-slate-900 rounded-lg border border-procore-border shadow-md overflow-hidden cursor-crosshair select-none"
            style={{
              backgroundImage: `
                radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px),
                linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px, 100px 100px, 100px 100px'
            }}
          >
            {/* Architectural Grid Lines Mockup */}
            <div className="absolute inset-8 border border-white/20 pointer-events-none">
              <div className="absolute top-0 bottom-0 left-1/3 border-r border-white/10" />
              <div className="absolute top-0 bottom-0 left-2/3 border-r border-white/10" />
              <div className="absolute left-0 right-0 top-1/2 border-b border-white/10" />

              {/* RTU Unit Geometry */}
              <div className="absolute top-[28%] left-[42%] w-[16%] h-[24%] border-2 border-emerald-400/80 bg-emerald-500/10 flex items-center justify-center text-center p-2 rounded">
                <span className="text-[11px] font-bold text-emerald-300">
                  RTU-1 (25-TON)<br />
                  <span className="text-[9px] text-white/70">54" x 72" CURB</span>
                </span>
              </div>

              {/* Ductwork Route */}
              <div className="absolute top-[38%] left-[58%] w-[24%] h-[4%] bg-blue-500/30 border border-blue-400/60" />
              <div className="absolute top-[42%] left-[78%] w-[4%] h-[20%] bg-blue-500/30 border border-blue-400/60" />
            </div>

            {/* Title Block */}
            <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm border border-white/20 p-3 rounded text-right pointer-events-none">
              <p className="text-white text-xs font-bold">{selectedDrawing?.drawing_number || 'M-201'}</p>
              <p className="text-gray-400 text-[10px]">{selectedDrawing?.title || 'Roof Plan'}</p>
              <p className="text-procore-orange text-[9px] font-bold mt-1">SCALE: 1/4" = 1'-0" · REV {selectedDrawing?.revision_number || '1'}</p>
            </div>

            {/* Markups Overlay */}
            {markups.map((m) => (
              <div
                key={m.id}
                style={{ left: `${m.x}%`, top: `${m.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {m.markup_type === 'rfi_pin' ? (
                  <div className="flex items-center gap-1 bg-procore-orange text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg ring-2 ring-white">
                    <span>📍</span> {m.text}
                  </div>
                ) : m.markup_type === 'obs_pin' ? (
                  <div className="flex items-center gap-1 bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg ring-2 ring-white">
                    <span>⚠️</span> {m.text}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-10 h-10 border-2 border-dashed border-cyan-400 bg-cyan-400/20 rounded-full animate-pulse flex items-center justify-center">
                      <span className="text-[10px] text-cyan-200 font-bold">☁️</span>
                    </div>
                    {m.text && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-black/85 text-cyan-300 text-[9px] font-bold px-2 py-0.5 rounded whitespace-nowrap shadow-md">
                        {m.text}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-procore-text-muted italic text-center">
            Click anywhere on the blueprint plan canvas to place a 2D markup annotation.
          </p>
        </div>
      </div>

      {/* Modal: New Drawing Sheet */}
      {isNewSheetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-procore-border">
            <h3 className="font-bold text-base text-procore-text mb-4">Add Drawing Sheet</h3>
            <form onSubmit={handleCreateSheet} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Sheet Number</label>
                <input
                  required
                  type="text"
                  value={sheetForm.drawing_number}
                  onChange={(e) => setSheetForm({ ...sheetForm, drawing_number: e.target.value })}
                  placeholder="e.g. S-102"
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Sheet Title</label>
                <input
                  required
                  type="text"
                  value={sheetForm.title}
                  onChange={(e) => setSheetForm({ ...sheetForm, title: e.target.value })}
                  placeholder="e.g. Roof Framing & Structural Header Schedule"
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Discipline</label>
                  <select
                    value={sheetForm.discipline}
                    onChange={(e) => setSheetForm({ ...sheetForm, discipline: e.target.value as any })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  >
                    <option value="Mechanical">Mechanical</option>
                    <option value="Structural">Structural</option>
                    <option value="Architectural">Architectural</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Revision Number</label>
                  <input
                    type="text"
                    value={sheetForm.revision_number}
                    onChange={(e) => setSheetForm({ ...sheetForm, revision_number: e.target.value })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-procore-border-light">
                <button
                  type="button"
                  onClick={() => setIsNewSheetModal(false)}
                  className="px-3 py-1.5 border border-procore-border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-procore-orange text-white font-bold rounded hover:bg-procore-orange-hover"
                >
                  Add Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
