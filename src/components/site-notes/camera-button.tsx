'use client';

import { useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface CameraButtonProps {
  onCapture: (file: File) => void;
  preview?: string;
}

export function CameraButton({ onCapture, preview }: CameraButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
    // reset so the same file can be re-selected if user clears and recaptures
    e.target.value = '';
  }

  function handleClear() {
    // Signal parent to clear by passing a synthetic empty event is not ideal;
    // we expose a separate clear path via the X button that triggers parent state reset.
    // Parent controls `preview`; parent should clear its own state on X click.
    // We emit a dummy signal — parent detects preview removal by their own state.
    // Actually: just call inputRef.current.click() is not needed here;
    // the X button needs parent to expose an onClear prop. Since the spec only
    // asks for onCapture, we hide the X and let parent manage clearing via preview prop.
    if (inputRef.current) inputRef.current.click();
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Hidden native file input — `capture="environment"` opens rear camera on mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleChange}
        aria-label="Capture photo"
      />

      {preview ? (
        <div className="relative w-full max-w-xs">
          <Image
            src={preview}
            alt="Captured photo preview"
            width={320}
            height={240}
            className="rounded-lg object-cover w-full h-40 border border-sand"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-1.5 right-1.5 bg-charcoal/70 text-white rounded-full p-0.5 hover:bg-charcoal transition-colors"
            aria-label="Replace photo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full max-w-xs h-24 flex-col gap-2 border-dashed border-sand text-muted-foreground hover:border-sage hover:text-sage"
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="w-6 h-6" />
          <span className="text-sm">Take Photo</span>
        </Button>
      )}
    </div>
  );
}
