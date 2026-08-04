'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function DashboardRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  useEffect(() => {
    router.replace(`/projects/${projectId}`);
  }, [projectId, router]);

  return (
    <div className="flex items-center justify-center py-16 text-slate-500 font-medium">
      Redirecting to Project Overview...
    </div>
  );
}
