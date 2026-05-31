'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  type: 'commercial' | 'residential';
  client_name: string;
  address: string;
  start_date: string;
  status: 'active' | 'bidding' | 'complete';
  overhead_pct: number;
  profit_pct: number;
}

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function ProjectCard({ project, onEdit, onDuplicate, onDelete }: ProjectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const statusColors = {
    active: 'bg-blue-100 text-blue-800',
    bidding: 'bg-yellow-100 text-yellow-800',
    complete: 'bg-green-100 text-green-800',
  };

  const handleMouseEnter = () => {
    gsap.to(cardRef.current, { scale: 1.02, duration: 0.2, ease: 'power2.out' });
  };

  const handleMouseLeave = () => {
    gsap.to(cardRef.current, { scale: 1, duration: 0.2, ease: 'power2.out' });
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(project);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate?.(project.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      onDelete?.(project.id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <Link href={`/projects/${project.id}`} className="block">
        <div
          ref={cardRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="p-4 hover:border-blue-500 transition-colors cursor-pointer"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg">{project.name}</h3>
            <span className={`text-xs px-2 py-1 rounded ${statusColors[project.status]}`}>
              {project.status}
            </span>
          </div>
          <p className="text-gray-900 text-sm mb-1">{project.client_name}</p>
          <p className="text-gray-900 text-sm mb-2">{project.address}</p>
          <div className="flex justify-between text-xs text-gray-900">
            <span className="capitalize">{project.type}</span>
            <span>{project.start_date}</span>
          </div>
        </div>
      </Link>
      <div className="flex border-t">
        <button
          onClick={handleEdit}
          className="flex-1 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-r"
        >
          Edit
        </button>
        <button
          onClick={handleDuplicate}
          className="flex-1 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-r"
        >
          Duplicate
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}