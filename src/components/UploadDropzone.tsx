'use client';

import { useDropzone } from 'react-dropzone';
import { useCallback, useState } from 'react';

interface UploadDropzoneProps {
  projectId: string;
  onUploadComplete?: () => void;
}

export default function UploadDropzone({ projectId, onUploadComplete }: UploadDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);

    try {
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResult(data);
      onUploadComplete?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }, [projectId, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
          } ${uploading ? 'opacity-50 cursor-wait' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="text-gray-800">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-2"></div>
            <p>Scanning receipt...</p>
          </div>
        ) : isDragActive ? (
          <p className="text-blue-600">Drop receipt here</p>
        ) : (
          <div className="text-gray-600">
            <p>Drag & drop a receipt image or PDF, or click to select</p>
            <p className="text-sm text-gray-600 mt-1">JPG, PNG, PDF accepted</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          <p className="font-medium">Receipt scanned successfully!</p>
          <div className="mt-2 text-sm">
            <p><strong>Vendor:</strong> {result.scanResult.vendor}</p>
            <p><strong>Amount:</strong> ${result.scanResult.total.toFixed(2)}</p>
            <p><strong>Category:</strong> {result.scanResult.suggested_category}</p>
            <p><strong>Confidence:</strong> {result.scanResult.confidence}</p>
          </div>
        </div>
      )}
    </div>
  );
}
