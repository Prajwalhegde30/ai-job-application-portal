'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useResumes,
  useUploadResume,
  useActivateResume,
  useReplaceResume,
  useDeleteResume,
} from '@/hooks/useResumes';
import { uploadResumeSchema } from '@/lib/validators/resume';
import type { UploadResumeInput } from '@/lib/validators/resume';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileText,
  UploadCloud,
  Eye,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileUp,
  Calendar,
  Layers,
} from 'lucide-react';

export default function ResumesPage() {
  const { data: resumes = [], isLoading, isError } = useResumes();
  const uploadResume = useUploadResume();
  const activateResume = useActivateResume();
  const replaceResume = useReplaceResume();
  const deleteResume = useDeleteResume();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [replaceProgress, setReplaceProgress] = useState<{
    id: string;
    val: number;
  } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedResumeForReplace, setSelectedResumeForReplace] = useState<
    string | null
  >(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UploadResumeInput>({
    resolver: zodResolver(uploadResumeSchema),
    defaultValues: {
      resumeTitle: '',
    },
  });

  // Handle Drag Over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Validate File (Size <= 5MB, MIME === PDF)
  const validateFile = (file: File): boolean => {
    setValidationError(null);

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setValidationError('Only PDF files are allowed.');
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      setValidationError('File size must not exceed 5 MB.');
      return false;
    }

    return true;
  };

  // Handle Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  // Submit Upload Form
  const onSubmit = async (data: UploadResumeInput) => {
    if (!selectedFile) {
      setValidationError('Please select or drop a PDF file first.');
      return;
    }

    setValidationError(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('resumeTitle', data.resumeTitle);

    try {
      await uploadResume.mutateAsync({
        formData,
        onProgress: (p) => setUploadProgress(p),
      });
      setSelectedFile(null);
      reset();
      const fileInput = document.getElementById(
        'resume-file-picker'
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch {
      // Handled by react query error
    } finally {
      setUploadProgress(null);
    }
  };

  // View Resume (Signed URL helper)
  const handleView = async (resumeId: string) => {
    try {
      const { data } = await api.get<{ data: { signedUrl: string } }>(
        `/resumes/${resumeId}`
      );
      window.open(data.data.signedUrl, '_blank');
    } catch {
      alert('Failed to view resume');
    }
  };

  // Replace File trigger
  const handleReplaceClick = (resumeId: string) => {
    setSelectedResumeForReplace(resumeId);
    document.getElementById('replace-file-picker')?.click();
  };

  // Handle Replace File execution
  const handleReplaceFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    const resumeId = selectedResumeForReplace;
    if (!file || !resumeId) return;

    if (!validateFile(file)) {
      alert(validationError || 'Invalid file');
      return;
    }

    setReplaceProgress({ id: resumeId, val: 0 });
    const formData = new FormData();
    formData.append('file', file);

    try {
      await replaceResume.mutateAsync({
        resumeId,
        formData,
        onProgress: (p) => setReplaceProgress({ id: resumeId, val: p }),
      });
    } catch {
      // Handled by react query
    } finally {
      setReplaceProgress(null);
      setSelectedResumeForReplace(null);
      const replaceInput = document.getElementById(
        'replace-file-picker'
      ) as HTMLInputElement;
      if (replaceInput) replaceInput.value = '';
    }
  };

  const formatSize = (bytes: number | null): string => {
    if (bytes == null) return 'N/A';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          Resume Manager
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Upload and manage multiple resumes. Set your active resume for job
          applications.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Upload Column */}
        <div className="lg:col-span-1">
          <div className="space-y-6 rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900/60 to-slate-900/20 p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <FileUp className="h-5 w-5 text-blue-400" />
              Upload Resume
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Title Input */}
              <div className="space-y-2">
                <Label htmlFor="resumeTitle" className="text-sm text-slate-300">
                  Resume Title <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="resume-title-input"
                  placeholder="e.g. Senior Frontend Resume"
                  {...register('resumeTitle')}
                  className="border-slate-800 bg-slate-900/50 text-white placeholder:text-slate-500 focus:border-blue-500"
                />
                {errors.resumeTitle && (
                  <p className="text-xs text-red-400">
                    {errors.resumeTitle.message}
                  </p>
                )}
              </div>

              {/* Drag and Drop Zone */}
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">
                  Resume File (PDF only)
                </Label>
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() =>
                    document.getElementById('resume-file-picker')?.click()
                  }
                  className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/30 px-4 py-8 text-center transition-all duration-300 hover:border-blue-500/50 hover:bg-slate-900/20 ${
                    selectedFile ? 'border-blue-500/40 bg-blue-950/5' : ''
                  }`}
                >
                  <input
                    id="resume-file-picker"
                    type="file"
                    onChange={handleFileChange}
                    accept="application/pdf"
                    className="hidden"
                  />
                  <UploadCloud className="mb-3 h-10 w-10 text-slate-500 transition-colors duration-300 group-hover:text-blue-400" />

                  {selectedFile ? (
                    <div className="space-y-1">
                      <p className="max-w-[200px] truncate text-sm font-medium text-blue-400">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatSize(selectedFile.size)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-slate-300">
                        Drag & drop your resume
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        PDF up to 5 MB
                      </p>
                    </div>
                  )}
                </div>
                {validationError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{validationError}</span>
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {uploadProgress !== null && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-blue-500 transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                id="upload-resume-btn"
                disabled={uploadResume.isPending || uploadProgress !== null}
                className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/10 hover:from-blue-500 hover:to-violet-500"
              >
                {uploadResume.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Resume'
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* List Column */}
        <div className="space-y-4 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Layers className="h-5 w-5 text-violet-400" />
            Your Resumes ({resumes.length})
          </h2>

          {/* Hidden Replace Input */}
          <input
            id="replace-file-picker"
            type="file"
            onChange={handleReplaceFileChange}
            accept="application/pdf"
            className="hidden"
          />

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border border-slate-800 bg-slate-900/30 p-5"
                >
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-lg bg-slate-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 rounded bg-slate-800" />
                      <div className="h-3 w-1/4 rounded bg-slate-800" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-8 text-center">
              <p className="text-red-400">
                Failed to load resumes. Please try again.
              </p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && resumes.length === 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-300">
                No resumes found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                You haven&apos;t uploaded any resumes yet. Add one to get
                started.
              </p>
            </div>
          )}

          {/* Resume Grid */}
          {!isLoading && !isError && resumes.length > 0 && (
            <div className="space-y-3">
              {resumes.map((resume) => {
                const isReplacingThis = replaceProgress?.id === resume.id;
                return (
                  <div
                    key={resume.id}
                    id={`resume-card-${resume.id}`}
                    className={`group rounded-xl border bg-gradient-to-br p-5 transition-all duration-300 ${
                      resume.isActive
                        ? 'border-blue-500/40 from-slate-900/80 to-slate-900/50 shadow-md shadow-blue-500/5'
                        : 'border-slate-800 from-slate-900/60 to-slate-900/20 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      {/* File Details */}
                      <div className="flex items-start gap-3.5 overflow-hidden">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-sm font-bold ${
                            resume.isActive
                              ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                              : 'border-slate-800 bg-slate-800/50 text-slate-400'
                          }`}
                        >
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="max-w-[240px] truncate text-sm font-semibold text-white">
                              {resume.resumeTitle}
                            </h3>
                            {resume.isActive && (
                              <span className="flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-950/50 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                                <CheckCircle2 className="h-3 w-3" />
                                Active for Apps
                              </span>
                            )}
                          </div>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {resume.fileName}
                          </p>

                          {/* Metadata */}
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(resume.createdAt)}
                            </span>
                            <span>•</span>
                            <span>{formatSize(resume.fileSize)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:self-center">
                        {/* View */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(resume.id)}
                          className="h-8 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Button>

                        {/* Activate Toggle */}
                        {!resume.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => activateResume.mutate(resume.id)}
                            disabled={activateResume.isPending}
                            className="h-8 text-xs text-slate-400 hover:bg-blue-950/30 hover:text-blue-400"
                          >
                            Activate
                          </Button>
                        )}

                        {/* Replace */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReplaceClick(resume.id)}
                          disabled={isReplacingThis || replaceResume.isPending}
                          className="h-8 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                          {isReplacingThis ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Replacing ({replaceProgress.val}%)
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                              Replace
                            </>
                          )}
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (
                              confirm(
                                'Are you sure you want to delete this resume?'
                              )
                            ) {
                              deleteResume.mutate(resume.id);
                            }
                          }}
                          disabled={deleteResume.isPending}
                          className="h-8 text-xs text-slate-400 hover:bg-red-950/30 hover:text-red-400"
                        >
                          {deleteResume.isPending &&
                          deleteResume.variables === resume.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Replace Progress Bar */}
                    {isReplacingThis && (
                      <div className="mt-4 space-y-1.5">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full bg-blue-500 transition-all duration-150"
                            style={{ width: `${replaceProgress.val}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
