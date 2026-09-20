'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import VoiceExpenseModal from './VoiceExpenseModal';

export default function Sidebar() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [isVoiceOpen, setIsVoiceOpen] = useState(false);

    const isActive = (href: string) => pathname.startsWith(href);

    return (
        <>
            {/* Mobile Header */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-[#09090b] border-b border-[#27272a] flex items-center px-4 z-40 md:hidden text-[#f4f4f5]">
                <button
                    onClick={() => setOpen(!open)}
                    className="p-2 rounded-lg text-[#f4f4f5] hover:bg-[#18181b] transition-colors"
                    aria-label="Toggle menu"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {open ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        )}
                    </svg>
                </button>
                <Link href="/" className="ml-3 flex items-center gap-2.5" onClick={() => setOpen(false)}>
                    <div className="w-8 h-8 rounded-lg bg-[#f4f4f5] text-[#09090b] flex items-center justify-center font-black">
                        C
                    </div>
                    <span className="text-[#f4f4f5] font-extrabold text-lg tracking-tight">ConsEstimate</span>
                </Link>
            </header>

            {/* Mobile Overlay */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 bottom-0 w-64 bg-[#09090b] border-r border-[#27272a] z-50 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 print:hidden ${open ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-5 border-b border-[#27272a]">
                    <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
                        <div className="w-9 h-9 rounded-xl bg-[#f4f4f5] text-[#09090b] flex items-center justify-center font-black text-lg shadow-lg">
                            C
                        </div>
                        <div>
                            <span className="text-[#f4f4f5] font-black text-lg tracking-tight">ConsEstimate</span>
                            <p className="text-zinc-400 text-[11px] font-bold tracking-widest">CONSTRUCTION MGMT</p>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-5 space-y-1">
                    <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                        Menu
                    </p>

                    <Link
                        href="/projects"
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-bold transition-all duration-150 ${isActive('/projects') && !pathname.startsWith('/submittals')
                                ? 'bg-[#f4f4f5] text-[#09090b] font-extrabold shadow-lg'
                                : 'text-[#f4f4f5] hover:bg-[#18181b]'
                            }`}
                    >
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                        </svg>
                        Projects
                    </Link>

                    <Link
                        href="/submittals"
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-bold transition-all duration-150 ${isActive('/submittals')
                                ? 'bg-[#f4f4f5] text-[#09090b] font-extrabold shadow-lg'
                                : 'text-[#f4f4f5] hover:bg-[#18181b]'
                            }`}
                    >
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Submittals
                    </Link>

                    <div className="pt-4">
                        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                            Quick Actions
                        </p>
                        <button
                            onClick={() => {
                                setOpen(false);
                                setIsVoiceOpen(true);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold text-[#f4f4f5] bg-[#121215] hover:bg-[#18181b] border border-[#27272a] transition-all duration-150 group text-left"
                        >
                            <span className="text-base group-hover:scale-110 transition-transform">🎙️</span>
                            <span>Voice Expense</span>
                        </button>
                    </div>
                </nav>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-[#27272a]">
                    <p className="text-[10px] font-bold text-zinc-500 tracking-wide">v0.1.0 • ZINC DARK THEME</p>
                </div>
            </aside>

            {/* Global Voice Expense Modal */}
            <VoiceExpenseModal
                isOpen={isVoiceOpen}
                onClose={() => setIsVoiceOpen(false)}
            />
        </>
    );
}
