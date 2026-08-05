'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  GanttRow,
  TimelineData,
  TaskDependency,
  ZoomLevel,
  TASK_STATUS_COLORS,
  ProjectTask,
} from '@/types/timeline';
import {
  buildGanttRows,
  buildDateColumns,
  getBarPosition,
  parseDate,
  formatDate,
  DateColumn,
} from '@/lib/timeline-engine';

interface GanttChartProps {
  data: TimelineData;
  zoom: ZoomLevel;
  showBaseline: boolean;
  showCriticalPath: boolean;
  onTaskClick: (task: ProjectTask) => void;
  onTaskUpdate: (taskId: string, updates: Partial<ProjectTask>) => void;
  onPhaseToggle: (phaseId: string) => void;
}

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 56;
const TASK_BAR_HEIGHT = 22;
const TASK_BAR_Y_OFFSET = (ROW_HEIGHT - TASK_BAR_HEIGHT) / 2;
const MILESTONE_SIZE = 10;

export default function GanttChart({
  data,
  zoom,
  showBaseline,
  showCriticalPath,
  onTaskClick,
  onTaskUpdate,
  onPhaseToggle,
}: GanttChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const leftPanelWidth = panelCollapsed ? 44 : isMobile ? 240 : 480;
  const [dragState, setDragState] = useState<{
    taskId: string;
    mode: 'move' | 'resize-end';
    startX: number;
    origStart: Date;
    origEnd: Date;
  } | null>(null);

  // Build rows
  const rows = useMemo(() => buildGanttRows(data), [data]);
  const visibleRows = useMemo(() => rows.filter(r => r.visible), [rows]);

  // Calculate date range (pad 2 weeks on each side)
  const { gridStart, gridEnd } = useMemo(() => {
    let minDate = new Date();
    let maxDate = new Date();
    if (visibleRows.length > 0) {
      minDate = visibleRows.reduce((min, r) => r.startDate < min ? r.startDate : min, visibleRows[0].startDate);
      maxDate = visibleRows.reduce((max, r) => r.endDate > max ? r.endDate : max, visibleRows[0].endDate);
    }
    const pad = zoom === 'month' ? 30 : zoom === 'week' ? 14 : 7;
    const gs = new Date(minDate.getTime() - pad * 86400000);
    const ge = new Date(maxDate.getTime() + pad * 86400000);
    return { gridStart: gs, gridEnd: ge };
  }, [visibleRows, zoom]);

  // Build date columns
  const columns = useMemo(() => buildDateColumns(gridStart, gridEnd, zoom), [gridStart, gridEnd, zoom]);
  const totalWidth = columns.reduce((s, c) => s + c.width, 0);
  const colWidth = columns.length > 0 ? columns[0].width : 36;

  // Scroll to today on mount
  useEffect(() => {
    if (!scrollContainerRef.current || columns.length === 0) return;
    const today = new Date();
    const todayOffset = getBarPosition(today, today, gridStart, colWidth, zoom).x;
    const containerWidth = scrollContainerRef.current.clientWidth;
    scrollContainerRef.current.scrollLeft = Math.max(0, todayOffset - containerWidth / 3);
  }, [columns, gridStart, colWidth, zoom]);

  // Today marker position
  const todayX = getBarPosition(new Date(), new Date(), gridStart, colWidth, zoom).x;

  // Drag handlers
  const handleBarMouseDown = useCallback((
    e: React.MouseEvent,
    row: GanttRow,
    mode: 'move' | 'resize-end'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (row.type === 'phase') return;
    setDragState({
      taskId: row.id,
      mode,
      startX: e.clientX,
      origStart: new Date(row.startDate),
      origEnd: new Date(row.endDate),
    });
  }, []);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX;
      const daysDelta = Math.round(dx / colWidth);
      if (daysDelta === 0) return;

      if (dragState.mode === 'move') {
        const newStart = new Date(dragState.origStart.getTime() + daysDelta * 86400000);
        const newEnd = new Date(dragState.origEnd.getTime() + daysDelta * 86400000);
        onTaskUpdate(dragState.taskId, {
          start_date: formatDate(newStart),
          end_date: formatDate(newEnd),
        });
      } else {
        const newEnd = new Date(dragState.origEnd.getTime() + daysDelta * 86400000);
        if (newEnd > dragState.origStart) {
          const dur = Math.ceil((newEnd.getTime() - dragState.origStart.getTime()) / 86400000) + 1;
          onTaskUpdate(dragState.taskId, {
            end_date: formatDate(newEnd),
            duration: dur,
          });
        }
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, colWidth, onTaskUpdate]);

  // Render dependency arrows
  const renderDependencyArrows = useCallback(() => {
    if (!data.dependencies || data.dependencies.length === 0) return null;
    const arrows: React.ReactNode[] = [];
    const rowIndexMap = new Map<string, number>();
    visibleRows.forEach((r, i) => rowIndexMap.set(r.id, i));

    for (const dep of data.dependencies) {
      const predIdx = rowIndexMap.get(dep.predecessor_id);
      const succIdx = rowIndexMap.get(dep.successor_id);
      if (predIdx === undefined || succIdx === undefined) continue;

      const predRow = visibleRows[predIdx];
      const succRow = visibleRows[succIdx];

      const predBar = getBarPosition(predRow.startDate, predRow.endDate, gridStart, colWidth, zoom);
      const succBar = getBarPosition(succRow.startDate, succRow.endDate, gridStart, colWidth, zoom);

      const startX = predBar.x + predBar.width;
      const startY = predIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
      const endX = succBar.x;
      const endY = succIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

      // L-shaped path with arrow
      const midX = startX + 12;
      const path = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;

      arrows.push(
        <g key={dep.id}>
          <path
            d={path}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray={dep.dependency_type !== 'FS' ? '4 2' : 'none'}
            markerEnd="url(#arrowhead)"
          />
        </g>
      );
    }

    return (
      <svg
        className="absolute top-0 left-0 pointer-events-none"
        width={totalWidth}
        height={visibleRows.length * ROW_HEIGHT}
        style={{ zIndex: 5 }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
          </marker>
        </defs>
        {arrows}
      </svg>
    );
  }, [data.dependencies, visibleRows, gridStart, colWidth, zoom, totalWidth]);

  // Sync vertical scroll between left and right panels
  const handleRightScroll = () => {
    if (scrollContainerRef.current && leftScrollRef.current) {
      leftScrollRef.current.scrollTop = scrollContainerRef.current.scrollTop;
    }
  };

  const handleLeftScroll = () => {
    if (scrollContainerRef.current && leftScrollRef.current) {
      scrollContainerRef.current.scrollTop = leftScrollRef.current.scrollTop;
    }
  };

  return (
    <div className="flex border border-slate-200 rounded-xl overflow-hidden print:overflow-visible bg-white shadow-sm relative print:border-none print:shadow-none">
      {/* Left panel — task list */}
      <div
        className="flex-shrink-0 border-r border-slate-200 bg-slate-50/80 transition-all duration-200 relative flex flex-col z-20 print:!w-72 print:!min-w-[280px] print:!max-w-none"
        style={{ width: leftPanelWidth }}
      >
        {/* Header */}
        <div
          className="flex items-center px-3 border-b border-slate-200 bg-slate-100/80 text-xs font-semibold text-slate-500 uppercase tracking-wider justify-between"
          style={{ height: HEADER_HEIGHT }}
        >
          <span className={`flex-1 truncate ${panelCollapsed ? 'hidden print:block' : ''}`}>Task Name</span>
          <span className={`w-14 text-center ${panelCollapsed || leftPanelWidth < 250 ? 'hidden print:block' : ''}`}>Status</span>
          <span className={`w-10 text-right ${panelCollapsed || leftPanelWidth < 250 ? 'hidden print:block' : ''}`}>%</span>

          {/* Panel collapse toggle button */}
          <button
            onClick={() => setPanelCollapsed(!panelCollapsed)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors ml-auto print:hidden"
            title={panelCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {panelCollapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* Rows */}
        <div
          ref={leftScrollRef}
          onScroll={handleLeftScroll}
          className="overflow-y-auto overflow-x-hidden scrollbar-none flex-1 print:overflow-visible print:max-h-none"
          style={{ maxHeight: `calc(100vh - 320px)` }}
        >
          {visibleRows.map((row) => (
            <div
              key={row.id}
              className={`flex items-center px-2 border-b border-slate-100 cursor-pointer transition-colors duration-100 ${
                hoveredRow === row.id ? 'bg-indigo-50/60' : ''
              } ${row.type === 'phase' ? 'bg-slate-50' : ''}`}
              style={{
                height: ROW_HEIGHT,
                paddingLeft: panelCollapsed ? 8 : Math.max(8, 8 + row.indent * (isMobile ? 10 : 18)),
              }}
              onMouseEnter={() => setHoveredRow(row.id)}
              onMouseLeave={() => setHoveredRow(null)}
              onClick={() => {
                if (row.type === 'phase') {
                  onPhaseToggle(row.id);
                } else if (row.task) {
                  onTaskClick(row.task);
                }
              }}
            >
              {/* Expand / collapse icon for phases */}
              {row.type === 'phase' && (
                <button className="mr-1 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${row.isCollapsed ? '' : 'rotate-90'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              )}

              {/* Milestone diamond */}
              {row.isMilestone && (
                <span className="mr-1 text-amber-500 text-xs flex-shrink-0">◆</span>
              )}

              {/* Color dot */}
              {row.type !== 'phase' && !row.isMilestone && (
                <span
                  className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0"
                  style={{ backgroundColor: row.color }}
                />
              )}

              {/* Name */}
              <span
                className={`flex-1 text-[12px] leading-tight ${
                  row.type === 'phase'
                    ? 'font-bold text-slate-800'
                    : 'text-slate-700'
                } ${row.isCritical && showCriticalPath ? 'text-red-600 font-semibold' : ''} ${
                  panelCollapsed ? 'hidden print:block' : 'print:whitespace-normal print:break-words'
                }`}
                title={row.name}
              >
                {row.name}
              </span>

              {/* Status chip */}
              <span className={`w-14 flex justify-center flex-shrink-0 ${panelCollapsed || leftPanelWidth < 250 ? 'hidden print:flex' : ''}`}>
                <span
                  className={`inline-flex items-center rounded-full px-1 py-0.5 text-[9px] font-medium ring-1 ring-inset ${
                    TASK_STATUS_COLORS[row.status]?.bg || 'bg-slate-100'
                  } ${TASK_STATUS_COLORS[row.status]?.text || 'text-slate-600'} ${
                    TASK_STATUS_COLORS[row.status]?.ring || 'ring-slate-300'
                  }`}
                >
                  {row.status === 'in_progress' ? 'Active' :
                   row.status === 'not_started' ? 'New' :
                   row.status === 'completed' ? '✓' :
                   row.status === 'delayed' ? 'Late' :
                   row.status === 'on_hold' ? 'Hold' : '—'}
                </span>
              </span>

              {/* Progress */}
              <span className={`w-10 text-right text-[11px] font-medium text-slate-500 flex-shrink-0 ${panelCollapsed || leftPanelWidth < 250 ? 'hidden print:block' : ''}`}>
                {Math.round(row.progress)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — Gantt bars */}
      <div className="flex-1 overflow-hidden print:overflow-visible">
        <div
          ref={scrollContainerRef}
          onScroll={handleRightScroll}
          className="overflow-auto touch-pan-x touch-pan-y print:overflow-visible print:max-h-none"
          style={{ maxHeight: `calc(100vh - 264px)` }}
        >
          <div style={{ width: totalWidth, position: 'relative' }}>
            {/* Date header */}
            <div
              className="flex sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-200 z-10"
              style={{ height: HEADER_HEIGHT }}
            >
              {columns.map((col, i) => (
                <div
                  key={i}
                  className={`flex-shrink-0 flex flex-col items-center justify-center border-r border-slate-100 text-[11px] ${
                    col.isToday ? 'bg-indigo-50/80 text-indigo-700 font-bold' : 
                    col.isWeekend ? 'bg-slate-50/60 text-slate-400' : 'text-slate-500'
                  } ${col.isMonthStart ? 'border-l-2 border-l-slate-300' : ''}`}
                  style={{ width: col.width }}
                >
                  {zoom === 'day' && (
                    <>
                      <span className="font-medium">{col.label}</span>
                      <span className="text-[9px] mt-0.5">{col.subLabel}</span>
                    </>
                  )}
                  {zoom === 'week' && (
                    <>
                      <span className="font-medium">{col.label}</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">{col.subLabel}</span>
                    </>
                  )}
                  {zoom === 'month' && (
                    <span className="font-semibold">{col.label}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Grid rows + bars */}
            <div className="relative" style={{ height: visibleRows.length * ROW_HEIGHT }}>
              {/* Background grid */}
              {columns.map((col, i) => {
                let x = 0;
                for (let j = 0; j < i; j++) x += columns[j].width;
                return (
                  <div
                    key={`grid-${i}`}
                    className={`absolute top-0 bottom-0 border-r border-slate-100/80 ${
                      col.isWeekend ? 'bg-slate-50/40' : ''
                    } ${col.isMonthStart ? 'border-l-2 border-l-slate-200/60' : ''}`}
                    style={{ left: x, width: col.width }}
                  />
                );
              })}

              {/* Horizontal row lines */}
              {visibleRows.map((_, i) => (
                <div
                  key={`hline-${i}`}
                  className="absolute left-0 right-0 border-b border-slate-100/60"
                  style={{ top: (i + 1) * ROW_HEIGHT }}
                />
              ))}

              {/* Today marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                style={{ left: todayX }}
              >
                <div className="absolute -top-1 -left-[9px] bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-sm">
                  TODAY
                </div>
              </div>

              {/* Dependency arrows */}
              {renderDependencyArrows()}

              {/* Task bars */}
              {visibleRows.map((row, rowIdx) => {
                const bar = getBarPosition(row.startDate, row.endDate, gridStart, colWidth, zoom);
                const y = rowIdx * ROW_HEIGHT + TASK_BAR_Y_OFFSET;
                const isHovered = hoveredRow === row.id;

                // Phase bar (summary bar)
                if (row.type === 'phase') {
                  return (
                    <div
                      key={row.id}
                      className="absolute transition-all duration-100"
                      style={{
                        left: bar.x,
                        top: y + 4,
                        width: Math.max(bar.width, 20),
                        height: TASK_BAR_HEIGHT - 8,
                      }}
                      onMouseEnter={() => setHoveredRow(row.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      {/* Phase summary bar */}
                      <div
                        className="h-full rounded-sm relative overflow-hidden"
                        style={{ backgroundColor: row.color + '30' }}
                      >
                        <div
                          className="absolute inset-y-0 left-0 rounded-sm"
                          style={{
                            width: `${row.progress}%`,
                            backgroundColor: row.color + '80',
                          }}
                        />
                        {/* Bookend markers */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-sm" style={{ backgroundColor: row.color }} />
                        <div className="absolute right-0 top-0 bottom-0 w-1 rounded-r-sm" style={{ backgroundColor: row.color }} />
                      </div>
                    </div>
                  );
                }

                // Milestone diamond
                if (row.isMilestone) {
                  return (
                    <div
                      key={row.id}
                      className="absolute cursor-pointer z-10"
                      style={{
                        left: bar.x - MILESTONE_SIZE,
                        top: y + (TASK_BAR_HEIGHT - MILESTONE_SIZE * 2) / 2,
                      }}
                      onClick={() => row.task && onTaskClick(row.task)}
                      onMouseEnter={() => setHoveredRow(row.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <svg width={MILESTONE_SIZE * 2} height={MILESTONE_SIZE * 2} viewBox="0 0 20 20">
                        <polygon
                          points="10,0 20,10 10,20 0,10"
                          fill={row.status === 'completed' ? '#10b981' : '#f59e0b'}
                          stroke={isHovered ? '#1e293b' : 'white'}
                          strokeWidth={2}
                        />
                      </svg>
                    </div>
                  );
                }

                // Normal task bar
                const barColor = TASK_STATUS_COLORS[row.status]?.bar || '#94a3b8';
                const isCritical = row.isCritical && showCriticalPath;

                return (
                  <div
                    key={row.id}
                    className={`absolute group cursor-pointer z-10 transition-all duration-100 ${
                      isHovered ? 'z-20' : ''
                    }`}
                    style={{
                      left: bar.x,
                      top: y,
                      width: Math.max(bar.width, 12),
                      height: TASK_BAR_HEIGHT,
                    }}
                    onMouseEnter={() => setHoveredRow(row.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => row.task && onTaskClick(row.task)}
                  >
                    {/* Baseline bar (ghost) */}
                    {showBaseline && row.baselineStart && row.baselineEnd && (
                      (() => {
                        const baseBar = getBarPosition(row.baselineStart, row.baselineEnd, gridStart, colWidth, zoom);
                        return (
                          <div
                            className="absolute rounded-full opacity-25"
                            style={{
                              left: baseBar.x - bar.x,
                              top: TASK_BAR_HEIGHT - 4,
                              width: Math.max(baseBar.width, 8),
                              height: 3,
                              backgroundColor: barColor,
                            }}
                          />
                        );
                      })()
                    )}

                    {/* Main bar */}
                    <div
                      className={`h-full rounded-md relative overflow-hidden transition-shadow duration-150 ${
                        isHovered ? 'shadow-lg ring-2 ring-indigo-400/50' : 'shadow-sm'
                      } ${isCritical ? 'ring-2 ring-red-500' : ''}`}
                      style={{
                        backgroundColor: barColor + '25',
                        border: `1px solid ${barColor}50`,
                      }}
                      onMouseDown={(e) => handleBarMouseDown(e, row, 'move')}
                    >
                      {/* Progress fill */}
                      <div
                        className="absolute inset-y-0 left-0 rounded-l-md transition-all duration-300"
                        style={{
                          width: `${row.progress}%`,
                          backgroundColor: barColor,
                          opacity: 0.7,
                        }}
                      />

                      {/* Label */}
                      {bar.width > 60 && (
                        <span className="absolute inset-0 flex items-center px-2 text-[11px] font-medium text-slate-800 truncate z-10">
                          {row.name}
                        </span>
                      )}

                      {/* Progress text */}
                      {bar.width > 30 && row.progress > 0 && row.progress < 100 && (
                        <span className="absolute right-1.5 inset-y-0 flex items-center text-[10px] font-bold text-slate-600 z-10">
                          {Math.round(row.progress)}%
                        </span>
                      )}

                      {/* Completed checkmark */}
                      {row.status === 'completed' && bar.width > 20 && (
                        <span className="absolute right-1 inset-y-0 flex items-center text-emerald-600 z-10">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </div>

                    {/* Resize handle (right edge) */}
                    <div
                      className="absolute top-0 -right-1 w-3 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      onMouseDown={(e) => handleBarMouseDown(e, row, 'resize-end')}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-3 bg-slate-400 rounded-full" />
                    </div>

                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div className="absolute left-1/2 -translate-x-1/2 -top-12 bg-slate-900 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-xl z-50 whitespace-nowrap pointer-events-none">
                        <div className="font-semibold">{row.name}</div>
                        <div className="text-slate-300">
                          {formatDate(row.startDate)} → {formatDate(row.endDate)} • {Math.round(row.progress)}%
                          {row.assignedTo && ` • ${row.assignedTo}`}
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-slate-900" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
