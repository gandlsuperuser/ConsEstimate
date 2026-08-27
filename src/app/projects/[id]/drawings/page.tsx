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
  const [history, setHistory] = useState<DrawingMarkup[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Drawing Tools State
  const [activeTool, setActiveTool] = useState<
    'select' | 'cloud' | 'arrow' | 'dimension' | 'rectangle' | 'pen' | 'callout' | 'rfi_pin' | 'obs_pin'
  >('cloud');
  const [selectedColor, setSelectedColor] = useState<string>('#F47E20');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [calloutText, setCalloutText] = useState('Verify dimensions with M-201');
  const [selectedMarkupId, setSelectedMarkupId] = useState<string | null>(null);

  // Mouse drag interaction state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPenPoints, setCurrentPenPoints] = useState<{ x: number; y: number }[]>([]);

  // Modals
  const [isNewSheetModal, setIsNewSheetModal] = useState(false);
  const [sheetForm, setSheetForm] = useState({
    drawing_number: 'M-201',
    title: 'Mechanical Roof Plan & Equipment Schedule',
    discipline: 'Mechanical' as ProjectDrawing['discipline'],
    revision_number: '1',
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pre-configured realistic sheets
  const defaultSheets: ProjectDrawing[] = [
    {
      id: 'drw-m201',
      project_id: projectId,
      drawing_number: 'M-201',
      title: 'Roof Mechanical Layout & RTU-1 Equipment Penetration',
      discipline: 'Mechanical',
      revision_number: 'R1',
      set_date: new Date().toISOString().split('T')[0],
      markups_count: 3,
    },
    {
      id: 'drw-s102',
      project_id: projectId,
      drawing_number: 'S-102',
      title: 'Roof Framing & Structural Header Cross-Angles Plan',
      discipline: 'Structural',
      revision_number: 'R2',
      set_date: new Date().toISOString().split('T')[0],
      markups_count: 1,
    },
    {
      id: 'drw-a101',
      project_id: projectId,
      drawing_number: 'A-101',
      title: 'Main Building Floor Plan & Partition Wall Dimensions',
      discipline: 'Architectural',
      revision_number: '0',
      set_date: new Date().toISOString().split('T')[0],
      markups_count: 0,
    },
    {
      id: 'drw-e301',
      project_id: projectId,
      drawing_number: 'E-301',
      title: '480V 3-Phase Power Distribution & Disconnect Schedule',
      discipline: 'Electrical',
      revision_number: '1',
      set_date: new Date().toISOString().split('T')[0],
      markups_count: 1,
    },
  ];

  const fetchDrawings = async () => {
    try {
      const res = await fetch(`/api/drawings?projectId=${projectId}`);
      const data = await res.json();
      const list = data.drawings || [];
      if (list.length === 0) {
        setDrawings(defaultSheets);
        setSelectedDrawing(defaultSheets[0]);
        // Initial sample markups
        const initialMarkups: DrawingMarkup[] = [
          {
            id: 'm-init-1',
            drawing_id: defaultSheets[0].id,
            markup_type: 'rfi_pin',
            x: 480,
            y: 220,
            text: 'RFI-042: 54"x72" Curb Opening Verification',
            color: '#F47E20',
            author_name: 'Mo Li (PM)',
          },
          {
            id: 'm-init-2',
            drawing_id: defaultSheets[0].id,
            markup_type: 'cloud',
            x: 400,
            y: 160,
            x2: 600,
            y2: 300,
            width: 200,
            height: 140,
            color: '#3B82F6',
            strokeWidth: 3,
            text: 'Structural curb enlargement',
            author_name: 'Structural Engineer',
          },
          {
            id: 'm-init-3',
            drawing_id: defaultSheets[0].id,
            markup_type: 'dimension',
            x: 400,
            y: 330,
            x2: 600,
            y2: 330,
            color: '#10B981',
            strokeWidth: 2,
            text: '24\'-0"',
            author_name: 'Estimator',
          },
        ];
        setMarkups(initialMarkups);
        setHistory([initialMarkups]);
        setHistoryIndex(0);
      } else {
        setDrawings(list);
        setSelectedDrawing(list[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDrawings();
  }, [projectId]);

  // Coordinate conversion helper (SVG coordinate space 1000 x 650)
  const getSvgCoordinates = (e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 1000 / rect.width;
    const scaleY = 650 / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  };

  const recordHistory = (newMarkups: DrawingMarkup[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newMarkups);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setMarkups(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setMarkups(history[historyIndex + 1]);
    }
  };

  // Mouse Down: Start Drawing
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!selectedDrawing) return;
    const pt = getSvgCoordinates(e);

    if (activeTool === 'select') {
      setSelectedMarkupId(null);
      return;
    }

    // Instant click tools: Pins & Callout
    if (activeTool === 'rfi_pin' || activeTool === 'obs_pin' || activeTool === 'callout') {
      const newMarkup: DrawingMarkup = {
        id: `mk-${Date.now()}`,
        drawing_id: selectedDrawing.id,
        markup_type: activeTool,
        x: pt.x,
        y: pt.y,
        color: activeTool === 'rfi_pin' ? '#F47E20' : activeTool === 'obs_pin' ? '#EF4444' : selectedColor,
        text: activeTool === 'rfi_pin' ? 'RFI-042 Reference' : activeTool === 'obs_pin' ? 'Quality Inspection Point' : calloutText,
        strokeWidth,
        author_name: 'Mo Li (PM)',
      };
      const updated = [...markups, newMarkup];
      setMarkups(updated);
      recordHistory(updated);
      return;
    }

    // Drag-based tools: cloud, arrow, dimension, rectangle, pen
    setIsDrawing(true);
    setStartPoint(pt);
    setCurrentPoint(pt);
    if (activeTool === 'pen') {
      setCurrentPenPoints([pt]);
    }
  };

  // Mouse Move: Live Preview
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || !startPoint) return;
    const pt = getSvgCoordinates(e);
    setCurrentPoint(pt);
    if (activeTool === 'pen') {
      setCurrentPenPoints((prev) => [...prev, pt]);
    }
  };

  // Mouse Up: Finalize markup
  const handleMouseUp = () => {
    if (!isDrawing || !startPoint || !currentPoint || !selectedDrawing) {
      setIsDrawing(false);
      return;
    }

    const dx = currentPoint.x - startPoint.x;
    const dy = currentPoint.y - startPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Ignore tiny accidental clicks for drag tools
    if (dist > 8 || activeTool === 'pen') {
      let newMarkup: DrawingMarkup;

      if (activeTool === 'pen') {
        newMarkup = {
          id: `mk-${Date.now()}`,
          drawing_id: selectedDrawing.id,
          markup_type: 'pen',
          x: startPoint.x,
          y: startPoint.y,
          points: currentPenPoints,
          color: selectedColor,
          strokeWidth,
          author_name: 'Mo Li (PM)',
        };
      } else if (activeTool === 'dimension') {
        // Calculate feet/inches from distance (scale: 20px = 1 foot)
        const feet = Math.round(dist / 15);
        newMarkup = {
          id: `mk-${Date.now()}`,
          drawing_id: selectedDrawing.id,
          markup_type: 'dimension',
          x: startPoint.x,
          y: startPoint.y,
          x2: currentPoint.x,
          y2: currentPoint.y,
          text: `${feet}'-0"`,
          color: selectedColor,
          strokeWidth,
          author_name: 'Mo Li (PM)',
        };
      } else if (activeTool === 'cloud') {
        const left = Math.min(startPoint.x, currentPoint.x);
        const top = Math.min(startPoint.y, currentPoint.y);
        const width = Math.abs(dx);
        const height = Math.abs(dy);
        newMarkup = {
          id: `mk-${Date.now()}`,
          drawing_id: selectedDrawing.id,
          markup_type: 'cloud',
          x: left,
          y: top,
          x2: left + width,
          y2: top + height,
          width,
          height,
          text: calloutText,
          color: selectedColor,
          strokeWidth,
          author_name: 'Mo Li (PM)',
        };
      } else if (activeTool === 'rectangle') {
        const left = Math.min(startPoint.x, currentPoint.x);
        const top = Math.min(startPoint.y, currentPoint.y);
        const width = Math.abs(dx);
        const height = Math.abs(dy);
        newMarkup = {
          id: `mk-${Date.now()}`,
          drawing_id: selectedDrawing.id,
          markup_type: 'rectangle',
          x: left,
          y: top,
          width,
          height,
          color: selectedColor,
          strokeWidth,
          author_name: 'Mo Li (PM)',
        };
      } else {
        // Arrow
        newMarkup = {
          id: `mk-${Date.now()}`,
          drawing_id: selectedDrawing.id,
          markup_type: 'arrow',
          x: startPoint.x,
          y: startPoint.y,
          x2: currentPoint.x,
          y2: currentPoint.y,
          text: calloutText,
          color: selectedColor,
          strokeWidth,
          author_name: 'Mo Li (PM)',
        };
      }

      const updated = [...markups, newMarkup];
      setMarkups(updated);
      recordHistory(updated);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
    setCurrentPenPoints([]);
  };

  const handleDeleteSelected = () => {
    if (!selectedMarkupId) return;
    const updated = markups.filter((m) => m.id !== selectedMarkupId);
    setMarkups(updated);
    recordHistory(updated);
    setSelectedMarkupId(null);
  };

  const handleClearAll = () => {
    if (confirm('Clear all markups from this drawing sheet?')) {
      setMarkups([]);
      recordHistory([]);
      setSelectedMarkupId(null);
    }
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

  // Helper to generate cloud scallops path
  const generateCloudPath = (x: number, y: number, w: number, h: number) => {
    const radius = 12;
    const stepsX = Math.max(2, Math.floor(w / (radius * 1.6)));
    const stepsY = Math.max(2, Math.floor(h / (radius * 1.6)));
    const stepW = w / stepsX;
    const stepH = h / stepsY;

    let path = `M ${x} ${y}`;
    // Top edge
    for (let i = 0; i < stepsX; i++) {
      const cx = x + (i + 0.5) * stepW;
      const cy = y - radius * 0.4;
      path += ` Q ${cx} ${cy} ${x + (i + 1) * stepW} ${y}`;
    }
    // Right edge
    for (let i = 0; i < stepsY; i++) {
      const cx = x + w + radius * 0.4;
      const cy = y + (i + 0.5) * stepH;
      path += ` Q ${cx} ${cy} ${x + w} ${y + (i + 1) * stepH}`;
    }
    // Bottom edge
    for (let i = stepsX; i > 0; i--) {
      const cx = x + (i - 0.5) * stepW;
      const cy = y + h + radius * 0.4;
      path += ` Q ${cx} ${cy} ${x + (i - 1) * stepW} ${y + h}`;
    }
    // Left edge
    for (let i = stepsY; i > 0; i--) {
      const cx = x - radius * 0.4;
      const cy = y + (i - 0.5) * stepH;
      path += ` Q ${cx} ${cy} ${x} ${y + (i - 1) * stepH}`;
    }
    path += ' Z';
    return path;
  };

  const currentSheetMarkups = markups.filter((m) => m.drawing_id === selectedDrawing?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-procore-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-procore-text tracking-tight">Drawings & Vector 2D Plan Markup</h1>
            <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
              Phase 5: Plan Viewer & Vector Canvas
            </span>
          </div>
          <p className="text-xs text-procore-text-muted mt-0.5">
            Full vector drawing engine: Revision Clouds, Directional Arrows, Scale Dimensions, Pins, Callouts, and Freehand Pen per ConsJ.rule section 5.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewSheetModal(true)}
            className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <span>+</span> Upload / Add Sheet
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Drawings Sheet Directory Sidebar */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-procore-text-muted px-1">
            Drawing Sheets ({drawings.length})
          </h2>
          {drawings.map((drw) => {
            const isSelected = selectedDrawing?.id === drw.id;
            const sheetMarkupCount = markups.filter((m) => m.drawing_id === drw.id).length;
            return (
              <div
                key={drw.id}
                onClick={() => {
                  setSelectedDrawing(drw);
                  setSelectedMarkupId(null);
                }}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white border-procore-orange shadow-sm ring-1 ring-procore-orange'
                    : 'bg-white border-procore-border hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-procore-orange">{drw.drawing_number}</span>
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    Rev {drw.revision_number}
                  </span>
                </div>
                <h3 className="font-bold text-xs text-procore-text mt-1">{drw.title}</h3>
                <div className="flex items-center justify-between text-[11px] text-procore-text-muted mt-2.5 pt-1.5 border-t border-procore-border-light">
                  <span className="font-semibold text-procore-text-secondary">{drw.discipline}</span>
                  <span className="font-bold text-procore-orange">{sheetMarkupCount} Markups</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Vector Canvas & Rich Toolbar */}
        <div className="lg:col-span-9 space-y-3">
          {/* Top Tool Palette & Styling Controls */}
          <div className="bg-white p-3 rounded-lg border border-procore-border shadow-xs space-y-2.5">
            {/* Row 1: Tool Selection */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-procore-border-light pb-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'select', label: '👆 Select', desc: 'Click to select or delete markup' },
                  { id: 'cloud', label: '☁️ Revision Cloud', desc: 'Click & drag to draw scalloped cloud box' },
                  { id: 'arrow', label: '↗️ Arrow', desc: 'Click & drag to draw leader arrow' },
                  { id: 'dimension', label: '📐 Scale Dim', desc: 'Click & drag for dimension measurement' },
                  { id: 'rectangle', label: '🔲 Box', desc: 'Click & drag to highlight area' },
                  { id: 'pen', label: '✏️ Freehand', desc: 'Click & drag to draw freeform lines' },
                  { id: 'callout', label: '💬 Callout', desc: 'Click to place text annotation' },
                  { id: 'rfi_pin', label: '📍 Pin RFI', desc: 'Click to drop RFI pin' },
                  { id: 'obs_pin', label: '⚠️ Pin Issue', desc: 'Click to drop Quality/Safety issue pin' },
                ].map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setActiveTool(tool.id as any);
                      setSelectedMarkupId(null);
                    }}
                    title={tool.desc}
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

              {/* Undo / Redo / Delete Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-procore-text rounded disabled:opacity-30"
                  title="Undo last markup"
                >
                  ↩ Undo
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-procore-text rounded disabled:opacity-30"
                  title="Redo markup"
                >
                  ↪ Redo
                </button>
                {selectedMarkupId && (
                  <button
                    onClick={handleDeleteSelected}
                    className="px-2.5 py-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded shadow-2xs animate-pulse"
                  >
                    🗑️ Delete Selected
                  </button>
                )}
                <button
                  onClick={handleClearAll}
                  className="px-2 py-1 text-xs text-procore-text-muted hover:text-red-600 font-semibold"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Row 2: Color, Line Thickness & Annotation Text */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                {/* Color swatches */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-procore-text-muted">Color:</span>
                  {[
                    { hex: '#F47E20', name: 'Procore Orange' },
                    { hex: '#EF4444', name: 'Red' },
                    { hex: '#3B82F6', name: 'Blue' },
                    { hex: '#10B981', name: 'Green' },
                    { hex: '#F59E0B', name: 'Yellow' },
                    { hex: '#8B5CF6', name: 'Purple' },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setSelectedColor(c.hex)}
                      className={`w-5 h-5 rounded-full border-2 transition-transform ${
                        selectedColor === c.hex ? 'scale-125 border-gray-900 shadow-xs' : 'border-white hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>

                {/* Line width */}
                <div className="flex items-center gap-1.5 pl-2 border-l border-procore-border-light">
                  <span className="font-bold text-procore-text-muted">Thickness:</span>
                  {[2, 4, 6].map((w) => (
                    <button
                      key={w}
                      onClick={() => setStrokeWidth(w)}
                      className={`px-2 py-0.5 rounded font-bold ${
                        strokeWidth === w ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {w === 2 ? 'Fine' : w === 4 ? 'Med' : 'Thick'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Callout text input */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-procore-text-muted">Note:</span>
                <input
                  type="text"
                  value={calloutText}
                  onChange={(e) => setCalloutText(e.target.value)}
                  placeholder="Enter note or tag..."
                  className="border border-procore-border px-2.5 py-1 rounded w-64 focus:border-procore-orange"
                />
              </div>
            </div>
          </div>

          {/* Interactive SVG Blueprint Vector Canvas */}
          <div
            ref={containerRef}
            className="relative w-full h-[540px] bg-slate-950 rounded-lg border border-procore-border shadow-xl overflow-hidden select-none"
          >
            {/* SVG Vector Drawing Layer */}
            <svg
              ref={svgRef}
              viewBox="0 0 1000 650"
              preserveAspectRatio="xMidYMid meet"
              className={`w-full h-full ${activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <defs>
                {/* Dynamic Arrowhead Markers for each color */}
                <marker id="arrow-F47E20" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M 1 1 L 7 4 L 1 7 Z" fill="#F47E20" />
                </marker>
                <marker id="arrow-EF4444" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M 1 1 L 7 4 L 1 7 Z" fill="#EF4444" />
                </marker>
                <marker id="arrow-3B82F6" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M 1 1 L 7 4 L 1 7 Z" fill="#3B82F6" />
                </marker>
                <marker id="arrow-10B981" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M 1 1 L 7 4 L 1 7 Z" fill="#10B981" />
                </marker>
                <marker id="arrow-F59E0B" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M 1 1 L 7 4 L 1 7 Z" fill="#F59E0B" />
                </marker>
                <marker id="arrow-8B5CF6" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M 1 1 L 7 4 L 1 7 Z" fill="#8B5CF6" />
                </marker>
              </defs>

              {/* Architectural CAD Grid Layer */}
              <g opacity="0.2">
                <rect x="50" y="40" width="900" height="560" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
                <line x1="350" y1="40" x2="350" y2="600" stroke="#FFFFFF" strokeWidth="0.8" strokeDasharray="5,5" />
                <line x1="680" y1="40" x2="680" y2="600" stroke="#FFFFFF" strokeWidth="0.8" strokeDasharray="5,5" />
                <line x1="50" y1="320" x2="950" y2="320" stroke="#FFFFFF" strokeWidth="0.8" strokeDasharray="5,5" />

                {/* Column Grid Bubbles */}
                <circle cx="50" cy="20" r="12" fill="#1E293B" stroke="#FFFFFF" strokeWidth="1" />
                <text x="50" y="24" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">A</text>
                <circle cx="350" cy="20" r="12" fill="#1E293B" stroke="#FFFFFF" strokeWidth="1" />
                <text x="350" y="24" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">B</text>
                <circle cx="680" cy="20" r="12" fill="#1E293B" stroke="#FFFFFF" strokeWidth="1" />
                <text x="680" y="24" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">C</text>
                <circle cx="950" cy="20" r="12" fill="#1E293B" stroke="#FFFFFF" strokeWidth="1" />
                <text x="950" y="24" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">D</text>

                <circle cx="20" cy="40" r="12" fill="#1E293B" stroke="#FFFFFF" strokeWidth="1" />
                <text x="20" y="44" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">1</text>
                <circle cx="20" cy="320" r="12" fill="#1E293B" stroke="#FFFFFF" strokeWidth="1" />
                <text x="20" y="324" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">2</text>
                <circle cx="20" cy="600" r="12" fill="#1E293B" stroke="#FFFFFF" strokeWidth="1" />
                <text x="20" y="604" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">3</text>
              </g>

              {/* Architectural CAD Plan Geometry Elements */}
              <g>
                {/* Mechanical Roof Equipment Pad */}
                <rect x="420" y="180" width="160" height="120" fill="rgba(16, 185, 129, 0.08)" stroke="#10B981" strokeWidth="2" />
                <line x1="420" y1="180" x2="580" y2="300" stroke="#10B981" strokeWidth="0.8" opacity="0.6" />
                <line x1="420" y1="300" x2="580" y2="180" stroke="#10B981" strokeWidth="0.8" opacity="0.6" />
                <text x="500" y="235" fill="#34D399" fontSize="13" fontWeight="bold" textAnchor="middle">
                  RTU-1 (25-TON)
                </text>
                <text x="500" y="255" fill="#A7F3D0" fontSize="10" textAnchor="middle">
                  54" x 72" ROOF CURB
                </text>

                {/* Ductwork Supply & Return lines */}
                <path d="M 580 210 L 780 210 L 780 420" fill="none" stroke="#38BDF8" strokeWidth="5" opacity="0.8" />
                <path d="M 580 270 L 720 270 L 720 420" fill="none" stroke="#60A5FA" strokeWidth="5" opacity="0.8" />
                <text x="650" y="200" fill="#38BDF8" fontSize="10" fontWeight="bold">SUPPLY DUCT 36"x24"</text>
                <text x="610" y="290" fill="#60A5FA" fontSize="10" fontWeight="bold">RETURN AIR 40"x28"</text>

                {/* Structural Framing beams */}
                <line x1="350" y1="180" x2="680" y2="180" stroke="#E2E8F0" strokeWidth="3" opacity="0.4" />
                <line x1="350" y1="300" x2="680" y2="300" stroke="#E2E8F0" strokeWidth="3" opacity="0.4" />
                <text x="370" y="170" fill="#94A3B8" fontSize="9">W12x26 BEAM</text>
                <text x="370" y="320" fill="#94A3B8" fontSize="9">W12x26 BEAM</text>
              </g>

              {/* Title Block on Blueprint */}
              <g transform="translate(730, 500)">
                <rect x="0" y="0" width="220" height="90" fill="#020617" stroke="#475569" strokeWidth="1.5" rx="4" />
                <text x="15" y="25" fill="#F47E20" fontSize="13" fontWeight="bold">
                  {selectedDrawing?.drawing_number || 'M-201'}
                </text>
                <text x="15" y="45" fill="#F8FAFC" fontSize="10" fontWeight="semibold">
                  {selectedDrawing?.title || 'Roof Mechanical Plan'}
                </text>
                <text x="15" y="65" fill="#94A3B8" fontSize="9">
                  SCALE: 1/4" = 1'-0" · REV {selectedDrawing?.revision_number || '1'}
                </text>
                <text x="15" y="80" fill="#64748B" fontSize="8">
                  CONSESTIMATE · BTX CONSTRUCTION
                </text>
              </g>

              {/* Render Saved Markups */}
              {currentSheetMarkups.map((m) => {
                const isSelected = selectedMarkupId === m.id;
                const strokeColor = m.color || '#F47E20';
                const sWidth = m.strokeWidth || 3;
                const markerId = `arrow-${strokeColor.replace('#', '')}`;

                return (
                  <g
                    key={m.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMarkupId(m.id);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Selection halo */}
                    {isSelected && (
                      <rect
                        x={(m.x || 0) - 15}
                        y={(m.y || 0) - 15}
                        width={(m.width || Math.abs((m.x2 || m.x) - m.x) || 40) + 30}
                        height={(m.height || Math.abs((m.y2 || m.y) - m.y) || 40) + 30}
                        fill="none"
                        stroke="#F47E20"
                        strokeWidth="2"
                        strokeDasharray="4,4"
                        opacity="0.8"
                      />
                    )}

                    {/* 1. Revision Cloud */}
                    {m.markup_type === 'cloud' && (
                      <g>
                        <path
                          d={generateCloudPath(m.x, m.y, m.width || 180, m.height || 120)}
                          fill="rgba(59, 130, 246, 0.08)"
                          stroke={strokeColor}
                          strokeWidth={sWidth}
                        />
                        {m.text && (
                          <g transform={`translate(${m.x + 10}, ${m.y + 25})`}>
                            <rect x="0" y="-14" width={m.text.length * 7.5 + 16} height="20" fill="#020617" opacity="0.9" rx="3" />
                            <text x="8" y="0" fill={strokeColor} fontSize="11" fontWeight="bold">
                              {m.text}
                            </text>
                          </g>
                        )}
                      </g>
                    )}

                    {/* 2. Arrow */}
                    {m.markup_type === 'arrow' && (
                      <g>
                        <line
                          x1={m.x}
                          y1={m.y}
                          x2={m.x2 || m.x + 80}
                          y2={m.y2 || m.y - 60}
                          stroke={strokeColor}
                          strokeWidth={sWidth}
                          markerEnd={`url(#${markerId})`}
                        />
                        {m.text && (
                          <g transform={`translate(${m.x}, ${m.y - 10})`}>
                            <rect x="-4" y="-14" width={m.text.length * 7 + 12} height="18" fill="#020617" opacity="0.9" rx="3" />
                            <text x="4" y="0" fill={strokeColor} fontSize="10" fontWeight="bold">
                              {m.text}
                            </text>
                          </g>
                        )}
                      </g>
                    )}

                    {/* 3. Dimension Line */}
                    {m.markup_type === 'dimension' && (
                      <g>
                        <line
                          x1={m.x}
                          y1={m.y}
                          x2={m.x2 || m.x + 100}
                          y2={m.y2 || m.y}
                          stroke={strokeColor}
                          strokeWidth={sWidth}
                        />
                        {/* Start and end tick marks */}
                        <line x1={m.x} y1={m.y - 8} x2={m.x} y2={m.y + 8} stroke={strokeColor} strokeWidth={sWidth} />
                        <line
                          x1={m.x2 || m.x + 100}
                          y1={(m.y2 || m.y) - 8}
                          x2={m.x2 || m.x + 100}
                          y2={(m.y2 || m.y) + 8}
                          stroke={strokeColor}
                          strokeWidth={sWidth}
                        />
                        {/* Dimension text */}
                        <g transform={`translate(${(m.x + (m.x2 || m.x + 100)) / 2}, ${(m.y + (m.y2 || m.y)) / 2 - 8})`}>
                          <rect x="-24" y="-12" width="48" height="18" fill="#020617" rx="3" />
                          <text x="0" y="1" fill={strokeColor} fontSize="11" fontWeight="bold" textAnchor="middle">
                            {m.text || '12\'-0"'}
                          </text>
                        </g>
                      </g>
                    )}

                    {/* 4. Rectangle */}
                    {m.markup_type === 'rectangle' && (
                      <rect
                        x={m.x}
                        y={m.y}
                        width={m.width || 120}
                        height={m.height || 80}
                        fill="rgba(244, 126, 32, 0.12)"
                        stroke={strokeColor}
                        strokeWidth={sWidth}
                        strokeDasharray="4,4"
                      />
                    )}

                    {/* 5. Freehand Pen */}
                    {m.markup_type === 'pen' && m.points && m.points.length > 1 && (
                      <path
                        d={`M ${m.points.map((p) => `${p.x} ${p.y}`).join(' L ')}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={sWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* 6. Callout Bubble */}
                    {m.markup_type === 'callout' && (
                      <g transform={`translate(${m.x}, ${m.y})`}>
                        <polygon points="0,0 12,-10 40,-10 40,-35 -40,-35 -40,-10 -5,-10" fill="#0F172A" stroke={strokeColor} strokeWidth="1.5" />
                        <text x="0" y="-20" fill="#F8FAFC" fontSize="10" fontWeight="bold" textAnchor="middle">
                          {m.text}
                        </text>
                      </g>
                    )}

                    {/* 7. RFI Pin */}
                    {m.markup_type === 'rfi_pin' && (
                      <g transform={`translate(${m.x}, ${m.y})`}>
                        <circle cx="0" cy="0" r="14" fill="#F47E20" stroke="#FFFFFF" strokeWidth="2.5" />
                        <text x="0" y="4" fill="#FFFFFF" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                          RFI
                        </text>
                        {m.text && (
                          <g transform="translate(18, -4)">
                            <rect x="0" y="-12" width={m.text.length * 6.8 + 14} height="20" fill="#020617" opacity="0.9" rx="3" stroke="#F47E20" strokeWidth="1" />
                            <text x="6" y="2" fill="#FDBA74" fontSize="10" fontWeight="bold">
                              {m.text}
                            </text>
                          </g>
                        )}
                      </g>
                    )}

                    {/* 8. Observation Pin */}
                    {m.markup_type === 'obs_pin' && (
                      <g transform={`translate(${m.x}, ${m.y})`}>
                        <circle cx="0" cy="0" r="14" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2.5" />
                        <text x="0" y="4" fill="#FFFFFF" fontSize="10" fontWeight="extrabold" textAnchor="middle">
                          OBS
                        </text>
                        {m.text && (
                          <g transform="translate(18, -4)">
                            <rect x="0" y="-12" width={m.text.length * 6.8 + 14} height="20" fill="#020617" opacity="0.9" rx="3" stroke="#EF4444" strokeWidth="1" />
                            <text x="6" y="2" fill="#FCA5A5" fontSize="10" fontWeight="bold">
                              {m.text}
                            </text>
                          </g>
                        )}
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Active Drawing Preview Ghost */}
              {isDrawing && startPoint && currentPoint && (
                <g opacity="0.75" pointerEvents="none">
                  {activeTool === 'cloud' && (
                    <path
                      d={generateCloudPath(
                        Math.min(startPoint.x, currentPoint.x),
                        Math.min(startPoint.y, currentPoint.y),
                        Math.abs(currentPoint.x - startPoint.x),
                        Math.abs(currentPoint.y - startPoint.y)
                      )}
                      fill="rgba(59, 130, 246, 0.15)"
                      stroke={selectedColor}
                      strokeWidth={strokeWidth}
                    />
                  )}
                  {activeTool === 'arrow' && (
                    <line
                      x1={startPoint.x}
                      y1={startPoint.y}
                      x2={currentPoint.x}
                      y2={currentPoint.y}
                      stroke={selectedColor}
                      strokeWidth={strokeWidth}
                    />
                  )}
                  {activeTool === 'dimension' && (
                    <g>
                      <line
                        x1={startPoint.x}
                        y1={startPoint.y}
                        x2={currentPoint.x}
                        y2={currentPoint.y}
                        stroke={selectedColor}
                        strokeWidth={strokeWidth}
                      />
                      <line x1={startPoint.x} y1={startPoint.y - 8} x2={startPoint.x} y2={startPoint.y + 8} stroke={selectedColor} strokeWidth={strokeWidth} />
                      <line x1={currentPoint.x} y1={currentPoint.y - 8} x2={currentPoint.x} y2={currentPoint.y + 8} stroke={selectedColor} strokeWidth={strokeWidth} />
                    </g>
                  )}
                  {activeTool === 'rectangle' && (
                    <rect
                      x={Math.min(startPoint.x, currentPoint.x)}
                      y={Math.min(startPoint.y, currentPoint.y)}
                      width={Math.abs(currentPoint.x - startPoint.x)}
                      height={Math.abs(currentPoint.y - startPoint.y)}
                      fill="rgba(244, 126, 32, 0.15)"
                      stroke={selectedColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray="4,4"
                    />
                  )}
                  {activeTool === 'pen' && currentPenPoints.length > 1 && (
                    <path
                      d={`M ${currentPenPoints.map((p) => `${p.x} ${p.y}`).join(' L ')}`}
                      fill="none"
                      stroke={selectedColor}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                    />
                  )}
                </g>
              )}
            </svg>
          </div>

          {/* Instructions and Quick Legend */}
          <div className="bg-white p-3 rounded-lg border border-procore-border shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs text-procore-text-muted">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-procore-text">
                Tool Action: {activeTool === 'select' ? 'Click on markup to select/delete' : 'Click & drag on blueprint canvas'}
              </span>
              <span>• Markups on sheet: <strong className="text-procore-orange">{currentSheetMarkups.length}</strong></span>
            </div>
            <div className="flex items-center gap-3 font-medium">
              <span className="flex items-center gap-1">☁️ Revision Cloud</span>
              <span className="flex items-center gap-1">↗️ Leader Arrow</span>
              <span className="flex items-center gap-1">📐 Dynamic Scale Dim</span>
              <span className="flex items-center gap-1 text-procore-orange">📍 Linked RFI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add Drawing Sheet */}
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
                    <option value="Civil">Civil</option>
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
