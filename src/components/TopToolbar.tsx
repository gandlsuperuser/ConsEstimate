'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import VoiceExpenseModal from './VoiceExpenseModal';
import { InAppNotification } from '@/types';

export default function TopToolbar() {
    const pathname = usePathname();
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
        const fetchNotifs = async () => {
            try {
                const res = await fetch('/api/notifications');
                const data = await res.json();
                setNotifications(data.notifications || []);
            } catch (err) {
                // ignore
            }
        };
        fetchNotifs();
    }, []);

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
            <header className="fixed top-0 left-0 right-0 h-12 bg-procore-dark z-50 flex items-center print:hidden">
                {/* Left: Logo & Brand */}
                <div className="flex items-center h-full">
                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden h-full px-3 text-gray-400 hover:text-white hover:bg-procore-dark-hover transition-colors"
                        aria-label="Toggle menu"
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
                        <div className="w-7 h-7 rounded-lg bg-procore-orange flex items-center justify-center shadow-md">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                            </svg>
                        </div>
                        <div className="hidden sm:block">
                            <span className="text-white font-bold text-sm tracking-tight leading-none">ConsEstimate</span>
                            <p className="text-gray-500 text-[9px] font-semibold tracking-widest uppercase leading-none mt-0.5">BTX Construction</p>
                        </div>
                    </Link>
                </div>

                {/* Center: Primary Nav */}
                <nav className="hidden md:flex items-center h-full flex-1 ml-1">
                    {primaryNavItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2 h-full px-4 text-[13px] font-semibold transition-colors relative ${
                                isActive(item.href)
                                    ? 'text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-procore-dark-hover'
                            }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                            {isActive(item.href) && (
                                <span className="absolute bottom-0 left-2 right-2 h-[3px] bg-procore-orange rounded-t-full" />
                            )}
                        </Link>
                    ))}
                </nav>

                {/* Right: Actions */}
                <div className="flex items-center h-full ml-auto">
                    {/* Quick Create Button */}
                    <div ref={quickCreateRef} className="relative h-full">
                        <button
                            onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
                            className="h-full px-3 flex items-center gap-1.5 text-white hover:bg-procore-dark-hover transition-colors"
                        >
                            <span className="w-6 h-6 rounded bg-procore-orange flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </span>
                            <span className="hidden lg:inline text-[12px] font-bold">Create</span>
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>

                        {isQuickCreateOpen && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-procore-border py-1.5 z-50">
                                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Quick Create</p>
                                <button
                                    onClick={() => {
                                        setIsQuickCreateOpen(false);
                                        setIsVoiceOpen(true);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-procore-text hover:bg-procore-orange-light transition-colors text-left"
                                >
                                    <span className="w-7 h-7 rounded-md bg-procore-orange-light flex items-center justify-center text-procore-orange">
                                        🎙️
                                    </span>
                                    Voice Expense
                                </button>
                                <Link
                                    href="/projects/new"
                                    onClick={() => setIsQuickCreateOpen(false)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-procore-text hover:bg-procore-orange-light transition-colors text-left"
                                >
                                    <span className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center text-blue-600">
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
                            className="h-full px-3 text-gray-400 hover:text-white hover:bg-procore-dark-hover transition-colors relative flex items-center"
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
                            <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-lg shadow-2xl border border-procore-border py-2 z-50">
                                <div className="px-3.5 py-1.5 border-b border-procore-border-light flex justify-between items-center">
                                    <span className="font-bold text-xs text-procore-text">Project Notifications</span>
                                    <span className="text-[10px] text-procore-orange font-bold uppercase">{unreadCount} Unread</span>
                                </div>
                                <div className="max-h-72 overflow-y-auto divide-y divide-procore-border-light">
                                    {notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => markAsRead(n.id)}
                                            className={`p-3 text-left transition-colors cursor-pointer hover:bg-gray-50 ${
                                                !n.is_read ? 'bg-procore-orange-light/30' : ''
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-[11px] text-procore-text">{n.title}</span>
                                                <span className="text-[9px] font-bold uppercase bg-white border px-1.5 py-0.2 rounded text-procore-text-muted">
                                                    {n.module}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-procore-text-secondary mt-0.5">{n.description}</p>
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
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="h-full px-3 flex items-center gap-2 hover:bg-procore-dark-hover transition-colors"
                        >
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-procore-orange to-amber-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                M
                            </div>
                            <div className="hidden xl:block text-left">
                                <p className="text-white text-[11px] font-semibold leading-none">Mo Li</p>
                                <p className="text-gray-500 text-[10px] leading-none mt-0.5">Project Manager</p>
                            </div>
                        </button>

                        {isUserMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-procore-border py-1.5 z-50">
                                <div className="px-3 py-2 border-b border-procore-border-light">
                                    <p className="text-sm font-semibold text-procore-text">Mo Li</p>
                                    <p className="text-xs text-procore-text-muted">Project Manager / Admin</p>
                                </div>
                                <button className="w-full text-left px-3 py-2 text-sm text-procore-text hover:bg-gray-50 transition-colors">
                                    Account Settings
                                </button>
                                <button className="w-full text-left px-3 py-2 text-sm text-procore-text-muted hover:bg-gray-50 transition-colors">
                                    Sign Out
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
                    <div className="fixed top-12 left-0 right-0 bg-procore-dark border-t border-white/10 z-45 md:hidden shadow-2xl">
                        <nav className="py-2">
                            {primaryNavItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                                        isActive(item.href)
                                            ? 'text-procore-orange bg-white/5'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
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
