'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ProjectPhoto } from '@/types';

interface ProjectPhotoModalProps {
  projectId: string;
  projectName?: string;
  isOpen: boolean;
  onClose: () => void;
  onPhotoCountChange?: (count: number) => void;
}

export default function ProjectPhotoModal({
  projectId,
  projectName,
  isOpen,
  onClose,
  onPhotoCountChange,
}: ProjectPhotoModalProps) {
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'progress' | 'site' | 'before_after' | 'issue' | 'other'>('all');
  const [captionInput, setCaptionInput] = useState('');
  const [uploadCategory, setUploadCategory] = useState<ProjectPhoto['category']>('progress');
  const [activePhotoPreview, setActivePhotoPreview] = useState<ProjectPhoto | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/photos?projectId=${projectId}`);
      const data = await res.json();
      if (data.photos) {
        setPhotos(data.photos);
        onPhotoCountChange?.(data.photos.length);
      }
    } catch (err) {
      console.error('Error fetching project photos:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, onPhotoCountChange]);

  useEffect(() => {
    if (isOpen) {
      fetchPhotos();
    }
  }, [isOpen, fetchPhotos]);

  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const fileArray = Array.from(files);

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setUploadProgressText(`Uploading (${i + 1}/${fileArray.length}): ${file.name}...`);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);
        formData.append('caption', captionInput || file.name.replace(/\.[^/.]+$/, ''));
        formData.append('category', uploadCategory || 'progress');

        const res = await fetch('/api/projects/photos', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          alert(`Failed to upload ${file.name}: ${err.error || 'Server error'}`);
        }
      }

      setCaptionInput('');
      await fetchPhotos();
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error uploading photos');
    } finally {
      setUploading(false);
      setUploadProgressText('');
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
        onPhotoCountChange?.(photos.length - 1);
      } else {
        alert('Failed to delete photo');
      }
    } catch (err) {
      console.error('Delete photo error:', err);
      alert('Error deleting photo');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center text-xl shadow-inner">
              📸
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">Project Photos & Site Gallery</h3>
                <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-500/40 text-indigo-200 rounded-full border border-indigo-400/30">
                  {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                {projectName ? `${projectName} • ` : ''}Upload and view construction progress photos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-indigo-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Top Upload Zone & Filters */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
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
            className={`border-2 border-dashed rounded-2xl p-4 transition-all flex flex-col md:flex-row items-center justify-between gap-4 ${
              dragActive
                ? 'border-indigo-500 bg-indigo-50/80'
                : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/70'
            }`}
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl flex-shrink-0">
                📷
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {uploading ? uploadProgressText : 'Upload Site Photos or Progress Images'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Drag and drop JPG, PNG, WEBP files, or click to browse. Photos are stored securely in cloud storage.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <input
                type="text"
                placeholder="Optional caption / note..."
                value={captionInput}
                onChange={(e) => setCaptionInput(e.target.value)}
                disabled={uploading}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-full sm:w-44"
              />

              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as ProjectPhoto['category'])}
                disabled={uploading}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-700"
              >
                <option value="progress">Progress</option>
                <option value="site">Site View</option>
                <option value="before_after">Before/After</option>
                <option value="issue">Issue / Note</option>
                <option value="other">Other</option>
              </select>

              <label className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm cursor-pointer transition-all flex items-center gap-1.5 ${
                uploading
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-indigo-600/25'
              }`}>
                {uploading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Upload Photos</span>
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

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap">
            {(['all', 'progress', 'site', 'before_after', 'issue', 'other'] as const).map((cat) => {
              const count = cat === 'all' ? photos.length : photos.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
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

        {/* Photos Grid Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium">Loading project photos...</p>
            </div>
          ) : filteredPhotos.length > 0 ? (
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
                    {/* Image Thumbnail */}
                    <div className="h-44 bg-slate-100 overflow-hidden relative flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.caption || photo.file_name}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border backdrop-blur-md bg-white/90 ${badge.text} ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDeletePhoto(photo.id, e)}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-xs"
                        title="Delete photo"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      {/* Hover Overlay Preview prompt */}
                      <div className="absolute inset-0 bg-indigo-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900/80 rounded-xl backdrop-blur-sm shadow-sm">
                          🔍 View Full Photo
                        </span>
                      </div>
                    </div>

                    {/* Metadata Card Footer */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800 truncate" title={photo.caption || photo.file_name}>
                          {photo.caption || photo.file_name}
                        </p>
                      </div>

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
              <h4 className="text-base font-bold text-slate-800">No project photos uploaded yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Customers and site managers can upload photos to document project progress, site conditions, and milestones.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Full Photo Preview Modal */}
      {activePhotoPreview && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setActivePhotoPreview(null)}
        >
          <div
            className="bg-slate-950 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-800 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
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

            {/* Image Preview Container */}
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
    </div>
  );
}
