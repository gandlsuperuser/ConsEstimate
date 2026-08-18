'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Project, ProjectPhoto } from '@/types';
import ProjectPhotoModal from '@/components/ProjectPhotoModal';

export default function ProjectPhotosPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [activePhotoPreview, setActivePhotoPreview] = useState<ProjectPhoto | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'progress' | 'site' | 'before_after' | 'issue' | 'other'>('all');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchPhotosAndProject = useCallback(async () => {
    try {
      const [projRes, photosRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/photos?projectId=${projectId}`),
      ]);
      const projData = await projRes.json();
      const photosData = await photosRes.json();
      setProject(projData.project);
      setPhotos(photosData.photos || []);
    } catch (err) {
      console.error('Error fetching photos/project:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPhotosAndProject();
  }, [fetchPhotosAndProject]);

  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const fileArray = Array.from(files);

    try {
      for (const file of fileArray) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);
        formData.append('caption', file.name.replace(/\.[^/.]+$/, ''));
        formData.append('category', selectedCategory === 'all' ? 'progress' : selectedCategory);

        await fetch('/api/projects/photos', {
          method: 'POST',
          body: formData,
        });
      }
      await fetchPhotosAndProject();
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error uploading photos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project photo?')) return;

    try {
      const res = await fetch(`/api/projects/photos?projectId=${projectId}&photoId=${photoId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        if (activePhotoPreview?.id === photoId) {
          setActivePhotoPreview(null);
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredPhotos = photos.filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  const categoryBadges: Record<string, { label: string; bg: string; text: string }> = {
    progress: { label: 'Progress', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
    site: { label: 'Site View', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
    before_after: { label: 'Before/After', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
    issue: { label: 'Issue / Note', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
    other: { label: 'Other', bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Loading project photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>📸</span> Project Photos & Site Gallery
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visual record of construction progress, field notes, and site updates for {project?.name || 'this project'}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsPhotoModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm shadow-indigo-500/25 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Upload & Manage Photos</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Photos</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{photos.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Stored in cloud storage</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-bold">
            📷
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Progress Shots</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {photos.filter((p) => p.category === 'progress').length}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Construction milestones</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold">
            🏗️
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Site & Issue Logs</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {photos.filter((p) => p.category === 'site' || p.category === 'issue').length}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Field documentation</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold">
            📋
          </div>
        </div>
      </div>

      {/* Main Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files) {
            handleUploadFiles(e.dataTransfer.files);
          }
        }}
        className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all bg-white ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50/70'
            : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50'
        }`}
      >
        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl mb-3 shadow-inner">
            📸
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {uploading ? 'Uploading photos to cloud storage...' : 'Drop project photos here'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Upload high-resolution job site photos, progress shots, and receipts. JPG, PNG, WEBP accepted.
          </p>

          <label className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 ${
            uploading
              ? 'bg-indigo-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-indigo-600/25'
          }`}>
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>Select Photos From Device</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  handleUploadFiles(e.target.files);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Filter Tabs & Gallery */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap">
            {(['all', 'progress', 'site', 'before_after', 'issue', 'other'] as const).map((cat) => {
              const count = cat === 'all' ? photos.length : photos.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span className="capitalize">{cat === 'all' ? 'All Photos' : cat.replace('_', ' ')}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="p-6">
          {filteredPhotos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPhotos.map((photo) => {
                const badge = categoryBadges[photo.category || 'progress'] || categoryBadges.other;
                const formattedDate = new Date(photo.uploaded_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <div
                    key={photo.id}
                    onClick={() => setActivePhotoPreview(photo)}
                    className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col relative"
                  >
                    <div className="h-48 bg-slate-100 overflow-hidden relative flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.caption || photo.file_name}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />

                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border backdrop-blur-md bg-white/90 ${badge.text} ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleDeletePhoto(photo.id, e)}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-xs"
                        title="Delete photo"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      <div className="absolute inset-0 bg-indigo-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900/80 rounded-xl backdrop-blur-sm shadow-sm">
                          🔍 View Full Photo
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <p className="text-xs font-bold text-slate-800 truncate" title={photo.caption || photo.file_name}>
                        {photo.caption || photo.file_name}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                        <span>{formattedDate}</span>
                        <a
                          href={photo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                        >
                          <span>↗</span> Open
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 text-2xl shadow-inner">
                🖼️
              </div>
              <h4 className="text-base font-bold text-slate-800">No project photos found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Upload photos using the dropzone above or click &ldquo;Upload & Manage Photos&rdquo;.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Preview */}
      {activePhotoPreview && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setActivePhotoPreview(null)}
        >
          <div
            className="bg-slate-950 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-800 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 text-white bg-slate-900/80">
              <div>
                <h4 className="text-sm font-bold text-white truncate max-w-md">
                  {activePhotoPreview.caption || activePhotoPreview.file_name}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Uploaded {new Date(activePhotoPreview.uploaded_at).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={activePhotoPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={activePhotoPreview.file_name}
                  className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors flex items-center gap-1"
                >
                  <span>⬇</span> Download
                </a>
                <button
                  onClick={() => setActivePhotoPreview(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40 min-h-[400px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePhotoPreview.url}
                alt={activePhotoPreview.caption || activePhotoPreview.file_name}
                className="max-h-[68vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* Upload & Manage Modal */}
      <ProjectPhotoModal
        projectId={projectId}
        projectName={project?.name}
        isOpen={isPhotoModalOpen}
        onClose={() => {
          setIsPhotoModalOpen(false);
          fetchPhotosAndProject();
        }}
      />
    </div>
  );
}
