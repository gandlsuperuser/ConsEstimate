'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import VoiceExpenseModal from './VoiceExpenseModal';
import { InAppNotification } from '@/types';

export default function TopToolbar() {
    const pathname = usePathname();
    const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);
    const [isVoiceOpen, setIsVoiceOpen] = useState(false);
    const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState<InAppNotification[]>([]);

    const quickCreateRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await fetch('/api/auth/session');
                const data = await res.json();
                if (data.user) {
                    setCurrentUser(data.user);
                }
            } catch (err) {
                // ignore
            }
        };

        const fetchNotifs = async () => {
            try {
                const res = await fetch('/api/notifications');
                const data = await res.json();
                setNotifications(data.notifications || []);
            } catch (err) {
                // ignore
            }
        };

        fetchSession();
        fetchNotifs();
    }, [pathname]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (quickCreateRef.current && !quickCreateRef.current.contains(e.target as Node)) {
                setIsQuickCreateOpen(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setIsUserMenuOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            // ignore
        }
        window.location.href = '/login';
    };

    if (pathname === '/login') {
        return null;
    }

    const markAsRead = async (id: string) => {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (err) {
            // ignore
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const primaryNavItems = [
        { href: '/projects', label: 'Portfolio', icon: PortfolioIcon },
    ];

    return (
        <>
            {/* Top Toolbar */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-procore-dark border-b border-zinc-800 px-2 sm:px-5 z-50 flex items-center print:hidden">
                {/* Left: Logo & Brand */}
                <div className="flex items-center h-full">
                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden h-full px-3 text-zinc-200 hover:text-white hover:bg-procore-dark-hover transition-colors"
                        aria-label="Toggle menu"
                        aria-expanded={isMobileMenuOpen}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isMobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            )}
                        </svg>
                    </button>

                    {/* Logo */}
                    <Link
                        href="/"
                        className="flex items-center gap-2.5 h-full px-4 hover:bg-procore-dark-hover transition-colors border-r border-white/10"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <div className="w-8 h-8 rounded-lg bg-procore-orange flex items-center justify-center shadow-md">
                            <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                            </svg>
                        </div>
                        <div className="hidden sm:block">
                            <span className="text-white font-extrabold text-base tracking-tight leading-none">ConsEstimate</span>
                            <p className="text-zinc-200 text-[13px] font-bold tracking-widest uppercase leading-none mt-0.5">BTX Construction</p>
                        </div>
                    </Link>
                </div>

                {/* Center: Primary Nav */}
                <nav className="hidden md:flex items-center h-full flex-1 ml-1">
                    {primaryNavItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2 h-full px-4 text-[15px] font-semibold transition-colors relative ${
                                isActive(item.href)
                                    ? 'text-white'
                                    : 'text-zinc-200 hover:text-white hover:bg-procore-dark-hover'
                            }`}
                        >
                            <item.icon className="w-4.5 h-4.5" />
                            {item.label}
                            {isActive(item.href) && (
                                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-zinc-100 rounded-t-full" />
                            )}
                        </Link>
                    ))}
                </nav>

                {/* Right: Actions */}
                <div className="flex items-center h-full ml-auto">
                    {/* Quick Create Button */}
                    <div ref={quickCreateRef} className="relative h-full">
                        <button
                            aria-label="Quick create"
                            aria-expanded={isQuickCreateOpen}
                            onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
                            className="h-full px-3 flex items-center gap-1.5 text-white hover:bg-procore-dark-hover transition-colors"
                        >
                            <span className="w-6.5 h-6.5 rounded bg-zinc-700 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </span>
                            <span className="hidden lg:inline text-[14px] font-bold">Create</span>
                            <svg className="w-3.5 h-3.5 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>

                        {isQuickCreateOpen && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-[#09090b] rounded-lg shadow-2xl border border-[#52525b] py-1.5 z-50">
                                <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-200">Quick Create</p>
                                <button
                                    onClick={() => {
                                        setIsQuickCreateOpen(false);
                                        setIsVoiceOpen(true);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#f4f4f5] hover:bg-[#18181b] transition-colors text-left"
                                >
                                    <span className="w-7 h-7 rounded-md bg-[#1f150c] flex items-center justify-center text-procore-orange">
                                        🎙️
                                    </span>
                                    Voice Expense
                                </button>
                                <Link
                                    href="/projects/new"
                                    onClick={() => setIsQuickCreateOpen(false)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#f4f4f5] hover:bg-[#18181b] transition-colors text-left"
                                >
                                    <span className="w-7 h-7 rounded-md bg-blue-950/60 flex items-center justify-center text-blue-400">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                    </span>
                                    New Project
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Notifications Center */}
                    <div ref={notificationsRef} className="relative h-full">
                        <button
                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                            className="h-full px-3 text-zinc-200 hover:text-[#f4f4f5] hover:bg-procore-dark-hover transition-colors relative flex items-center"
                            title="Notifications"
                        >
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                            </svg>
                            {unreadCount > 0 && (
                                <span className="absolute top-2.5 right-2 w-4 h-4 bg-procore-orange text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {isNotificationsOpen && (
                            <div className="absolute right-0 top-full mt-1 w-80 bg-[#09090b] rounded-lg shadow-2xl border border-[#52525b] py-2 z-50">
                                <div className="px-3.5 py-1.5 border-b border-[#52525b] flex justify-between items-center">
                                    <span className="font-bold text-xs text-[#f4f4f5]">Project Notifications</span>
                                    <span className="text-xs text-procore-orange font-bold uppercase">{unreadCount} Unread</span>
                                </div>
                                <div className="max-h-72 overflow-y-auto divide-y divide-[#27272a]">
                                    {notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => markAsRead(n.id)}
                                            className={`p-3 text-left transition-colors cursor-pointer hover:bg-[#18181b] ${
                                                !n.is_read ? 'bg-[#1a140c]' : ''
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-[13px] text-[#f4f4f5]">{n.title}</span>
                                                <span className="text-[9px] font-bold uppercase bg-[#18181b] border border-[#52525b] px-1.5 py-0.2 rounded text-zinc-200">
                                                    {n.module}
                                                </span>
                                            </div>
                                            <p className="text-[13px] text-zinc-300 mt-0.5">{n.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="w-px h-6 bg-white/10 mx-1" />

                    {/* User Avatar */}
                    <div ref={userMenuRef} className="relative h-full">
                        <button
                            aria-label="Account menu"
                            aria-expanded={isUserMenuOpen}
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="h-full px-3 flex items-center gap-2 hover:bg-procore-dark-hover transition-colors"
                        >
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 border border-orange-400/40 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                {(currentUser?.name || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div className="hidden xl:block text-left">
                                <p className="text-[#f4f4f5] text-[13px] font-semibold leading-none">{currentUser?.name || 'Administrator'}</p>
                                <p className="text-zinc-200 text-xs leading-none mt-0.5">Admin Clearance</p>
                            </div>
                        </button>

                        {isUserMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-[#09090b] rounded-lg shadow-2xl border border-[#52525b] py-1.5 z-50">
                                <div className="px-3 py-2 border-b border-[#52525b]">
                                    <p className="text-sm font-semibold text-[#f4f4f5]">{currentUser?.name || 'Administrator'}</p>
                                    <p className="text-[11px] text-zinc-400 truncate">{currentUser?.email || 'admin@consestimate.com'}</p>
                                    <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-950/60 border border-orange-700/50 text-[10px] text-orange-300 font-bold uppercase tracking-wider">
                                        Full Admin
                                    </div>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors flex items-center gap-2"
                                >
                                    <span>🚪</span>
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile Nav Dropdown */}
            {isMobileMenuOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <div className="fixed top-16 left-0 right-0 bg-procore-dark border-t border-white/10 z-45 md:hidden shadow-2xl">
                        <nav className="py-2">
                            {primaryNavItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                                        isActive(item.href)
                                            ? 'text-procore-orange bg-white/5'
                                            : 'text-zinc-200 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.label}
                                </Link>
                            ))}
                            <div className="border-t border-white/10 mt-2 pt-2">
                                <button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        setIsVoiceOpen(true);
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-procore-orange hover:bg-white/5 transition-colors w-full text-left"
                                >
                                    <span>🎙️</span>
                                    Voice Expense
                                </button>
                            </div>
                        </nav>
                    </div>
                </>
            )}

            {/* Voice Expense Modal */}
            <VoiceExpenseModal
                isOpen={isVoiceOpen}
                onClose={() => setIsVoiceOpen(false)}
            />
        </>
    );
}

// Icon components
function PortfolioIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
    );
}
