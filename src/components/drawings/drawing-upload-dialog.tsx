'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, UploadCloud } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface UploadFormValues {
  notes: string;
}

interface DrawingUploadDialogProps {
  projectId: string;
  drawingType: string;
  drawingId?: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type UploadStep = 'idle' | 'creating' | 'presigning' | 'uploading' | 'submitting' | 'done';

const STEP_LABELS: Record<UploadStep, string> = {
  idle: '',
  creating: 'Creating drawing record…',
  presigning: 'Preparing upload…',
  uploading: 'Uploading file…',
  submitting: 'Submitting for approval…',
  done: 'Done',
};

export function DrawingUploadDialog({
  projectId,
  drawingType,
  drawingId,
  open,
  onClose,
  onSuccess,
}: DrawingUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [step, setStep] = useState<UploadStep>('idle');
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm<UploadFormValues>({
    defaultValues: { notes: '' },
  });

  const isLoading = step !== 'idle' && step !== 'done';

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError(null);
  }

  function handleClose() {
    if (isLoading) return;
    reset();
    setSelectedFile(null);
    setStep('idle');
    setError(null);
    onClose();
  }

  async function onSubmit(values: UploadFormValues) {
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    setError(null);

    try {
      // Step 1: Create drawing row if no existing drawingId
      let activeDrawingId = drawingId;
      if (!activeDrawingId) {
        setStep('creating');
        const createRes = await fetch(`/api/v1/projects/${projectId}/drawings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ drawingType }),
        });
        if (!createRes.ok) {
          const body = await createRes.json().catch(() => ({}));
          throw new Error(body?.error?.message ?? 'Failed to create drawing record.');
        }
        const createData = await createRes.json();
        activeDrawingId = createData.data?.id;
        if (!activeDrawingId) throw new Error('Drawing record created but no ID returned.');
      }

      // Step 2: Get presigned upload URL
      setStep('presigning');
      const presignRes = await fetch(
        `/api/v1/projects/${projectId}/drawings/${activeDrawingId}/upload`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: selectedFile.name, contentType: selectedFile.type }),
        }
      );
      if (!presignRes.ok) {
        const body = await presignRes.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? 'Failed to get upload URL.');
      }
      const { uploadUrl, fileUrl } = await presignRes.json();

      // Step 3: Upload file directly to R2
      setStep('uploading');
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: { 'Content-Type': selectedFile.type },
      });
      if (!uploadRes.ok) throw new Error('File upload to storage failed.');

      // Step 4: Submit drawing with file URL and notes
      setStep('submitting');
      const submitRes = await fetch(
        `/api/v1/projects/${projectId}/drawings/${activeDrawingId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'submit', fileUrl, notes: values.notes }),
        }
      );
      if (!submitRes.ok) {
        const body = await submitRes.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? 'Failed to submit drawing.');
      }

      setStep('done');
      reset();
      setSelectedFile(null);
      setStep('idle');
      onSuccess();
      onClose();
    } catch (err) {
      setStep('idle');
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#2C2A26]">Upload & Submit Drawing</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* File picker */}
          <div className="space-y-1.5">
            <Label htmlFor="drawing-file" className="text-[#2C2A26] text-sm font-medium">
              Drawing File <span className="text-destructive">*</span>
            </Label>
            <label
              htmlFor="drawing-file"
              className="flex flex-col items-center justify-center w-full min-h-[100px] border-2 border-dashed border-[#D1BFA7] rounded-lg cursor-pointer bg-[#F8F6F1] hover:border-[#8A9A7B] transition-colors px-4 py-6 text-center"
            >
              <UploadCloud className="w-8 h-8 text-[#8A9A7B] mb-2" />
              {selectedFile ? (
                <span className="text-sm text-[#2C2A26] font-medium break-all">
                  {selectedFile.name}
                </span>
              ) : (
                <>
                  <span className="text-sm text-[#2C2A26]">Click to choose a file</span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    PDF, DWG, PNG, JPG — max 50 MB
                  </span>
                </>
              )}
            </label>
            <input
              id="drawing-file"
              type="file"
              accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
              className="sr-only"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="drawing-notes" className="text-[#2C2A26] text-sm font-medium">
              Notes (optional)
            </Label>
            <Textarea
              id="drawing-notes"
              placeholder="Add any notes for this revision…"
              className="resize-none text-sm"
              rows={3}
              disabled={isLoading}
              {...register('notes')}
            />
          </div>

          {/* Upload progress */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-[#8A9A7B]">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{STEP_LABELS[step]}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !selectedFile}
              className="min-h-[44px] bg-[#8A9A7B] hover:bg-[#7a8a6b] text-white border-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                'Upload & Submit'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
