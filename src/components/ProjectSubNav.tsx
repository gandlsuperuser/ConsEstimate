'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState, useEffect, useMemo } from 'react';

interface ProjectSubNavProps {
    projectId: string;
}

interface NavTabItem {
    id: string;
    href: string;
    label: string;
    exact?: boolean;
    icon: React.ComponentType<{ className?: string }>;
}

export default function ProjectSubNav({ projectId }: ProjectSubNavProps) {
    const pathname = usePathname();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // Drag and Drop state
    const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
    const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

    const baseTabs: NavTabItem[] = useMemo(() => [
        {
            id: 'home',
            href: `/projects/${projectId}`,
            label: 'Home',
            exact: true,
            icon: HomeIcon,
        },
        {
            id: 'estimate',
            href: `/projects/${projectId}/estimate`,
            label: 'Estimating',
            icon: EstimateIcon,
        },
        {
            id: 'bidding',
            href: `/projects/${projectId}/bidding`,
            label: 'Bidding',
            icon: BiddingIcon,
        },
        {
            id: 'contracts',
            href: `/projects/${projectId}/contracts`,
            label: 'Contracts',
            icon: ContractIcon,
        },
        {
            id: 'drawings',
            href: `/projects/${projectId}/drawings`,
            label: 'Drawings & 2D Markup',
            icon: DrawingIcon,
        },
        {
            id: 'submittals',
            href: `/projects/${projectId}/submittals`,
            label: 'Submittals',
            icon: SubmittalIcon,
        },
        {
            id: 'action-plans',
            href: `/projects/${projectId}/action-plans`,
            label: 'Action Plans & QA',
            icon: ActionPlanIcon,
        },
        {
            id: 'rfis',
            href: `/projects/${projectId}/rfis`,
            label: 'RFIs',
            icon: RFIIcon,
        },
        {
            id: 'change-events',
            href: `/projects/${projectId}/change-events`,
            label: 'Change Events',
            icon: ChangeEventIcon,
        },
        {
            id: 'change-orders',
            href: `/projects/${projectId}/change-orders`,
            label: 'Change Orders',
            icon: ChangeOrderIcon,
        },
        {
            id: 'observations',
            href: `/projects/${projectId}/observations`,
            label: 'Observations',
            icon: ObservationIcon,
        },
        {
            id: 'photos',
            href: `/projects/${projectId}/photos`,
            label: 'Photos',
            icon: PhotoIcon,
        },
        {
            id: 'conversations',
            href: `/projects/${projectId}/conversations`,
            label: 'Conversations',
            icon: ChatIcon,
        },
        {
            id: 'pay-apps',
            href: `/projects/${projectId}/pay-apps`,
            label: 'Pay Apps',
            icon: PayAppIcon,
        },
        {
            id: 'owner-billing',
            href: `/projects/${projectId}/owner-billing`,
            label: 'Owner Billing',
            icon: OwnerBillingIcon,
        },
        {
            id: 'receipts',
            href: `/projects/${projectId}/receipts`,
            label: 'Budget & Spend',
            icon: BudgetIcon,
        },
        {
            id: 'timeline',
            href: `/projects/${projectId}/timeline`,
            label: 'Schedule',
            icon: ScheduleIcon,
        },
        {
            id: 'directory',
            href: `/projects/${projectId}/directory`,
            label: 'Trade Directory',
            icon: DirectoryIcon,
        },
        {
            id: 'analytics',
            href: `/projects/${projectId}/analytics`,
            label: 'Analytics & Risk',
            icon: AnalyticsIcon,
        },
        {
            id: 'activity',
            href: `/projects/${projectId}/activity`,
            label: 'Audit Trail',
            icon: ActivityIcon,
        },
    ], [projectId]);

    const [tabs, setTabs] = useState<NavTabItem[]>(baseTabs);

    // Load persisted tab order from localStorage
    useEffect(() => {
        try {
            const storageKey = `consestimate_tabs_order_${projectId}`;
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const orderIds: string[] = JSON.parse(saved);
                const map = new Map(baseTabs.map(t => [t.id, t]));
                const ordered: NavTabItem[] = [];
                orderIds.forEach(id => {
                    const found = map.get(id);
                    if (found) {
                        ordered.push(found);
                        map.delete(id);
                    }
                });
                // Append any newly added tabs not present in stored order
                map.forEach(tab => ordered.push(tab));
                setTabs(ordered);
                return;
            }
        } catch (e) {
            // ignore
        }
        setTabs(baseTabs);
    }, [baseTabs, projectId]);

    const checkScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    };

    useEffect(() => {
        checkScroll();
        const el = scrollRef.current;
        if (el) {
            el.addEventListener('scroll', checkScroll);
            window.addEventListener('resize', checkScroll);
        }
        return () => {
            el?.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        const amount = 240;
        el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
    };

    /* ---- DRAG AND DROP HANDLERS (CHROME TAB REORDERING) ---- */
    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedTabId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverTabId !== id) {
            setDragOverTabId(id);
        }
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedTabId || draggedTabId === targetId) {
            setDraggedTabId(null);
            setDragOverTabId(null);
            return;
        }

        setTabs(prev => {
            const fromIdx = prev.findIndex(t => t.id === draggedTabId);
            const toIdx = prev.findIndex(t => t.id === targetId);
            if (fromIdx < 0 || toIdx < 0) return prev;

            const updated = [...prev];
            const [moved] = updated.splice(fromIdx, 1);
            updated.splice(toIdx, 0, moved);

            try {
                localStorage.setItem(`consestimate_tabs_order_${projectId}`, JSON.stringify(updated.map(t => t.id)));
            } catch (err) {
                // ignore
            }

            return updated;
        });

        setDraggedTabId(null);
        setDragOverTabId(null);
    };

    const handleDragEnd = () => {
        setDraggedTabId(null);
        setDragOverTabId(null);
    };

    const handleResetOrder = () => {
        setTabs(baseTabs);
        try {
            localStorage.removeItem(`consestimate_tabs_order_${projectId}`);
        } catch (err) {
            // ignore
        }
    };

    return (
        <div className="bg-[#dfe1e5] dark:bg-gray-900 border-b border-gray-300 dark:border-gray-800 relative pt-1.5 px-2 select-none">
            {/* Scroll indicator - Left */}
            {canScrollLeft && (
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#dfe1e5] dark:from-gray-900 to-transparent z-30 flex items-center justify-start pl-1 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                    title="Scroll Left"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>
            )}

            {/* Scroll indicator - Right */}
            {canScrollRight && (
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-10 top-0 bottom-0 w-8 bg-gradient-to-l from-[#dfe1e5] dark:from-gray-900 to-transparent z-30 flex items-center justify-end pr-1 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                    title="Scroll Right"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </button>
            )}

            {/* Reset Order Button */}
            <div className="absolute right-2 top-2 bottom-0 z-30 flex items-center">
                <button
                    onClick={handleResetOrder}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs px-1.5 py-1 rounded hover:bg-gray-200/80 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    title="Reset tab positions to default"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                </button>
            </div>

            {/* Chrome Floating Tabs Container */}
            <div
                ref={scrollRef}
                className="flex items-end overflow-x-auto scrollbar-none whitespace-nowrap pr-12 pl-1 gap-1"
            >
                {tabs.map((tab, idx) => {
                    const isActive = tab.exact
                        ? pathname === tab.href
                        : pathname.startsWith(tab.href);

                    const isBeingDragged = draggedTabId === tab.id;
                    const isDragOver = dragOverTabId === tab.id && draggedTabId !== tab.id;

                    return (
                        <div
                            key={tab.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, tab.id)}
                            onDragOver={(e) => handleDragOver(e, tab.id)}
                            onDrop={(e) => handleDrop(e, tab.id)}
                            onDragEnd={handleDragEnd}
                            className={`group relative flex items-center transition-all duration-150 cursor-grab active:cursor-grabbing ${
                                isBeingDragged
                                    ? 'opacity-40 scale-105 z-50 shadow-2xl -translate-y-1'
                                    : isDragOver
                                    ? 'border-l-4 border-l-procore-orange pl-1'
                                    : ''
                            }`}
                            title="Drag and drop to rearrange tabs"
                        >
                            <Link
                                href={tab.href}
                                className={`flex items-center gap-2 px-3.5 py-2 text-[12px] font-semibold rounded-t-xl transition-all duration-150 min-w-fit relative ${
                                    isActive
                                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-[0_-1px_4px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.06)] font-bold border-t-2 border-t-procore-orange border-x border-gray-300/80 dark:border-gray-700 -mb-px z-20 scale-[1.02] transform'
                                        : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-gray-800/60 hover:-translate-y-0.5 hover:shadow-xs'
                                }`}
                            >
                                {/* Grip dots indicator */}
                                <span className="opacity-0 group-hover:opacity-40 transition-opacity text-[9px] -ml-1 text-gray-500 font-mono tracking-tighter">
                                    ⋮⋮
                                </span>

                                <tab.icon className={`w-3.5 h-3.5 ${isActive ? 'text-procore-orange' : 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400'}`} />
                                <span>{tab.label}</span>
                            </Link>

                            {/* Divider line between inactive tabs (just like Chrome) */}
                            {!isActive && idx < tabs.length - 1 && tabs[idx + 1] && (
                                !(tabs[idx + 1].exact ? pathname === tabs[idx + 1].href : pathname.startsWith(tabs[idx + 1].href)) && (
                                    <div className="w-[1px] h-3.5 bg-gray-300 dark:bg-gray-700 mx-0.5 self-center" />
                                )
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Tab icons
function HomeIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
    );
}

function EstimateIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
        </svg>
    );
}

function BiddingIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
    );
}

function ContractIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
    );
}

function DrawingIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
    );
}

function SubmittalIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
    );
}

function ActionPlanIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
    );
}

function RFIIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
    );
}

function ChangeEventIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
    );
}

function ChangeOrderIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
    );
}

function ObservationIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

function PhotoIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 6A1.5 1.5 0 0 1 5.25 4.5h13.5A1.5 1.5 0 0 1 20.25 6v12a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6Z" />
        </svg>
    );
}

function ChatIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.75.75 0 0 1-.974-.94 4.05 4.05 0 0 0 .6-1.71C3.42 16.91 2.25 14.58 2.25 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
        </svg>
    );
}

function PayAppIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
    );
}

function OwnerBillingIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
        </svg>
    );
}

function BudgetIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function ScheduleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
    );
}

function DirectoryIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
        </svg>
    );
}

function AnalyticsIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
        </svg>
    );
}

function ActivityIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
    );
}
