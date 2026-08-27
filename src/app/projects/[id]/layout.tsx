import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ProjectSubNav from '@/components/ProjectSubNav';

interface ProjectLayoutProps {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

    if (!project) {
        notFound();
    }

    const statusStyles: Record<string, string> = {
        active: 'bg-green-100 text-green-800',
        bidding: 'bg-amber-100 text-amber-800',
        complete: 'bg-blue-100 text-blue-800',
    };

    return (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6">
            {/* Procore-style project header bar */}
            <div className="bg-white border-b border-procore-border px-4 sm:px-6 lg:px-8 py-3 print:hidden">
                <div className="max-w-[1400px] mx-auto">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/projects"
                                className="text-procore-text-muted hover:text-procore-orange transition-colors"
                                title="Back to Portfolio"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                </svg>
                            </Link>
                            <div className="w-px h-6 bg-procore-border" />
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-lg font-bold text-procore-text tracking-tight">{project.name}</h1>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyles[project.status] || 'bg-gray-100 text-gray-700'}`}>
                                        {project.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-[12px] text-procore-text-secondary mt-0.5">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                        </svg>
                                        {project.client_name}
                                    </span>
                                    <span className="text-procore-border">|</span>
                                    <span className="flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                        </svg>
                                        {project.address}
                                    </span>
                                    <span className="text-procore-border">|</span>
                                    <span className="capitalize">{project.type}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Procore-style tool tab bar */}
            <div className="print:hidden sticky top-12 z-30">
                <ProjectSubNav projectId={id} />
            </div>

            {/* Page Content */}
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
            </div>
        </div>
    );
}
