'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

export type WorkspaceWidthMode = 'fullscreen' | 'wide' | 'standard' | 'custom';

const STORAGE_KEY = 'consestimate_workspace_width_mode';
const CUSTOM_WIDTH_KEY = 'consestimate_workspace_custom_width';

interface ProjectWorkspaceLayoutProps {
  projectHeader: React.ReactNode;
  subNav: React.ReactNode;
  children: React.ReactNode;
}

export default function ProjectWorkspaceLayout({
  projectHeader,
  subNav,
  children,
}: ProjectWorkspaceLayoutProps) {
  const [widthMode, setWidthMode] = useState<WorkspaceWidthMode>('fullscreen');
  const [customWidth, setCustomWidth] = useState<number>(1600);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number>(1920);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 0 });

  // Initialize from localStorage and measure window width
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY) as WorkspaceWidthMode | null;
      if (savedMode && ['fullscreen', 'wide', 'standard', 'custom'].includes(savedMode)) {
        setWidthMode(savedMode);
      } else {
        // Default to fullscreen so the user immediately gets the requested full screen UI
        setWidthMode('fullscreen');
      }

      const savedCustomWidth = localStorage.getItem(CUSTOM_WIDTH_KEY);
      if (savedCustomWidth) {
        const num = parseInt(savedCustomWidth, 10);
        if (!isNaN(num) && num >= 1050) {
          setCustomWidth(num);
        }
      }
    } catch {
      // ignore
    }

    const updateWindowWidth = () => {
      setWindowWidth(window.innerWidth);
      setIsNativeFullscreen(!!document.fullscreenElement);
    };

    updateWindowWidth();
    window.addEventListener('resize', updateWindowWidth);
    document.addEventListener('fullscreenchange', updateWindowWidth);

    return () => {
      window.removeEventListener('resize', updateWindowWidth);
      document.removeEventListener('fullscreenchange', updateWindowWidth);
    };
  }, []);

  // Listen for custom toggle events from page toolbars (like Owner Billing)
  useEffect(() => {
    const handleSetWidth = (e: Event) => {
      const customEvent = e as CustomEvent<WorkspaceWidthMode | 'toggle'>;
      if (customEvent.detail === 'toggle') {
        setWidthMode((prev) => {
          const next = prev === 'fullscreen' ? 'standard' : 'fullscreen';
          try {
            localStorage.setItem(STORAGE_KEY, next);
          } catch {}
          return next;
        });
      } else if (customEvent.detail) {
        setWidthMode(customEvent.detail);
        try {
          localStorage.setItem(STORAGE_KEY, customEvent.detail);
        } catch {}
      }
    };

    window.addEventListener('consestimate-set-workspace-width', handleSetWidth);
    return () => {
      window.removeEventListener('consestimate-set-workspace-width', handleSetWidth);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMenuOpen]);

  // Update mode helper
  const handleSelectMode = (mode: WorkspaceWidthMode) => {
    setWidthMode(mode);
    setIsMenuOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
    window.dispatchEvent(new CustomEvent('consestimate-workspace-width-change', { detail: mode }));
  };

  const handleToggleFullscreen = () => {
    if (widthMode === 'fullscreen') {
      handleSelectMode('standard');
    } else {
      handleSelectMode('fullscreen');
    }
  };

  const handleCustomWidthChange = (val: number) => {
    setCustomWidth(val);
    setWidthMode('custom');
    try {
      localStorage.setItem(CUSTOM_WIDTH_KEY, String(val));
      localStorage.setItem(STORAGE_KEY, 'custom');
    } catch {}
    window.dispatchEvent(new CustomEvent('consestimate-workspace-width-change', { detail: 'custom' }));
  };

  // Toggle native browser fullscreen
  const toggleNativeFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Native fullscreen error:', err);
    }
  };

  // Drag-to-resize side handles
  const startDrag = useCallback(
    (e: React.MouseEvent, side: 'left' | 'right') => {
      e.preventDefault();
      setIsDragging(side);

      const currentContainerWidth = containerRef.current
        ? containerRef.current.getBoundingClientRect().width
        : widthMode === 'standard'
        ? 1400
        : widthMode === 'wide'
        ? 1800
        : windowWidth;

      dragStartRef.current = {
        startX: e.clientX,
        startWidth: currentContainerWidth,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - dragStartRef.current.startX;
        // If dragging right handle, positive deltaX expands width
        // If dragging left handle, negative deltaX expands width
        const multiplier = side === 'right' ? 2 : -2;
        const newWidth = Math.round(dragStartRef.current.startWidth + deltaX * multiplier);

        // Snap to fullscreen if dragged near screen edges
        if (newWidth >= window.innerWidth - 64) {
          setWidthMode('fullscreen');
          try {
            localStorage.setItem(STORAGE_KEY, 'fullscreen');
          } catch {}
        } else {
          const clamped = Math.max(1100, Math.min(newWidth, window.innerWidth - 32));
          setCustomWidth(clamped);
          setWidthMode('custom');
          try {
            localStorage.setItem(CUSTOM_WIDTH_KEY, String(clamped));
            localStorage.setItem(STORAGE_KEY, 'custom');
          } catch {}
        }
      };

      const handleMouseUp = () => {
        setIsDragging(null);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [widthMode, windowWidth]
  );

  // Compute container styles and classes
  const getContainerClasses = () => {
    switch (widthMode) {
      case 'fullscreen':
        return 'w-full max-w-none px-3 sm:px-6 lg:px-8';
      case 'wide':
        return 'max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8';
      case 'standard':
        return 'max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8';
      case 'custom':
        return 'mx-auto px-4 sm:px-6 lg:px-8';
    }
  };

  const getContainerStyle = (): React.CSSProperties => {
    if (widthMode === 'custom') {
      return { maxWidth: `${customWidth}px`, width: '100%' };
    }
    return {};
  };

  return (
    <div className="project-workspace print:m-0 print:p-0 min-h-screen bg-[#09090b] text-[#f4f4f5]">
      {/* Top Project Header Bar with integrated Width & Full Screen Control */}
      <div className="bg-[#09090b] border-b border-[#27272a] py-2.5 print:hidden sticky top-0 z-40">
        <div className={`transition-all duration-200 ${getContainerClasses()}`} style={getContainerStyle()}>
          <div className="flex items-center justify-between gap-4">
            {/* Left: Project title & metadata passed from layout */}
            <div className="min-w-0 flex-1">{projectHeader}</div>

            {/* Right: Width & Full Screen Control Center */}
            <div className="flex items-center gap-2 shrink-0 relative" ref={menuRef}>
              {/* Direct Full Screen / Standard Toggle Pill */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer select-none border ${
                  widthMode === 'fullscreen'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-blue-500/20'
                    : 'bg-[#18181b] hover:bg-[#27272a] text-[#f4f4f5] border-[#3f3f46]'
                }`}
                title={
                  widthMode === 'fullscreen'
                    ? 'Full Screen Active (100% of browser width). Click to switch to Standard (1400px).'
                    : 'Switch to Full Screen (100% of browser width)'
                }
              >
                {widthMode === 'fullscreen' ? (
                  <>
                    {/* Compress icon */}
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M10 10V4m0 6H4m6 0L3 3m10 7h6m-6 0V4m0 6l7-7"
                      />
                    </svg>
                    <span>Full Screen</span>
                    <span className="text-[10px] bg-blue-700/80 text-white px-1.5 py-0.2 rounded font-black tracking-wide">
                      100%
                    </span>
                  </>
                ) : (
                  <>
                    {/* Expand icon */}
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                      />
                    </svg>
                    <span>Full Screen</span>
                  </>
                )}
              </button>

              {/* Width Settings Dropdown Trigger */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  isMenuOpen
                    ? 'bg-[#27272a] text-white border-[#52525b]'
                    : 'bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] border-[#3f3f46]'
                }`}
                title="Adjust workspace width & screen settings"
                aria-label="Adjust workspace width"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
                  />
                </svg>
              </button>

              {/* Width Controls Popover Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-10 w-72 bg-[#121215] border border-[#27272a] rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100 text-[#f4f4f5]">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#27272a]">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                      Workspace Width
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {widthMode === 'fullscreen'
                        ? '100% Fluid'
                        : widthMode === 'wide'
                        ? '1800px'
                        : widthMode === 'standard'
                        ? '1400px'
                        : `${customWidth}px`}
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    <button
                      type="button"
                      onClick={() => handleSelectMode('fullscreen')}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-center ${
                        widthMode === 'fullscreen'
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#18181b] hover:bg-[#27272a] text-zinc-300'
                      }`}
                    >
                      Full 100%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectMode('wide')}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-center ${
                        widthMode === 'wide'
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#18181b] hover:bg-[#27272a] text-zinc-300'
                      }`}
                    >
                      Wide 1800
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectMode('standard')}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-center ${
                        widthMode === 'standard'
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#18181b] hover:bg-[#27272a] text-zinc-300'
                      }`}
                    >
                      Standard
                    </button>
                  </div>

                  {/* Width Slider */}
                  <div className="space-y-1 mb-3 pt-1 border-t border-[#27272a]/70">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>Adjust Width:</span>
                      <span className="font-mono text-white font-semibold">
                        {widthMode === 'fullscreen' ? 'Full Screen' : `${customWidth}px`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1150}
                      max={Math.max(windowWidth, 1920)}
                      step={25}
                      value={widthMode === 'fullscreen' ? Math.max(windowWidth, 1920) : customWidth}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (val >= Math.max(windowWidth, 1920) - 50) {
                          handleSelectMode('fullscreen');
                        } else {
                          handleCustomWidthChange(val);
                        }
                      }}
                      className="w-full accent-blue-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span>1150px</span>
                      <span>1400px</span>
                      <span>1800px</span>
                      <span>Max</span>
                    </div>
                  </div>

                  {/* Browser Native Fullscreen (F11) Toggle */}
                  <div className="pt-2 border-t border-[#27272a]">
                    <button
                      type="button"
                      onClick={toggleNativeFullscreen}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 bg-[#18181b] hover:bg-[#27272a] text-xs font-semibold rounded-lg text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                          />
                        </svg>
                        Browser Fullscreen (F11)
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {isNativeFullscreen ? 'Exit' : 'Enter'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Procore-style tool tab bar */}
      <div className="print:hidden sticky top-12 z-30">
        {subNav}
      </div>

      {/* Main Page Content Container with Interactive Side Resize Handles */}
      <div className="relative w-full py-5 print:p-0 print:m-0">
        <div
          ref={containerRef}
          className={`relative transition-all duration-150 ${getContainerClasses()}`}
          style={getContainerStyle()}
        >
          {/* Draggable Left Side Handle (active when not in 100% full screen mode) */}
          {widthMode !== 'fullscreen' && (
            <div
              onMouseDown={(e) => startDrag(e, 'left')}
              onDoubleClick={() => handleSelectMode('fullscreen')}
              className="absolute -left-3 top-0 bottom-0 w-3 cursor-ew-resize group z-30 hidden lg:flex items-center justify-center select-none"
              title="Drag outward to expand width • Double-click for Full Screen"
            >
              <div className="w-1 h-20 bg-zinc-700/60 group-hover:bg-blue-500 rounded-full transition-colors shadow-xs group-hover:h-32" />
            </div>
          )}

          {/* Children Content (Owner Billing, Estimate, Drawings, etc.) */}
          {children}

          {/* Draggable Right Side Handle (active when not in 100% full screen mode) */}
          {widthMode !== 'fullscreen' && (
            <div
              onMouseDown={(e) => startDrag(e, 'right')}
              onDoubleClick={() => handleSelectMode('fullscreen')}
              className="absolute -right-3 top-0 bottom-0 w-3 cursor-ew-resize group z-30 hidden lg:flex items-center justify-center select-none"
              title="Drag outward to expand width • Double-click for Full Screen"
            >
              <div className="w-1 h-20 bg-zinc-700/60 group-hover:bg-blue-500 rounded-full transition-colors shadow-xs group-hover:h-32" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
