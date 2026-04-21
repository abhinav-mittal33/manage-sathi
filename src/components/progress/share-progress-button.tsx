'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShareProgressButtonProps {
  projectId: string;
}

export function ShareProgressButton({ projectId }: ShareProgressButtonProps) {
  const [copied, setCopied] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/progress/${projectId}`;

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFallbackUrl(url);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        onClick={handleShare}
        className="gap-2 border-sage text-sage hover:bg-sage/10"
      >
        <Share2 className="w-4 h-4" />
        {copied ? 'Link copied!' : 'Share progress link'}
      </Button>
      {fallbackUrl && (
        <input
          type="text"
          readOnly
          value={fallbackUrl}
          className="w-full text-xs border border-sand rounded px-2 py-1.5 bg-white text-charcoal"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
      )}
    </div>
  );
}
