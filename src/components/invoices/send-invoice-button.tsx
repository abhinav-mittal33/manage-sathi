'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SendInvoiceButtonProps {
  invoiceId: string;
  status: string;
  onSuccess: () => void;
}

export function SendInvoiceButton({ invoiceId, status, onSuccess }: SendInvoiceButtonProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const canSend = status === 'draft' || status === 'sent';

  async function handleSend() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/invoices/${invoiceId}/send`, { method: 'POST' });
      if (res.ok) { setSent(true); onSuccess(); }
    } finally {
      setLoading(false);
    }
  }

  if (!canSend) return null;

  return (
    <Button
      onClick={handleSend}
      disabled={loading}
      className="gap-2 bg-sage hover:bg-sage/90 text-white min-h-[44px]"
    >
      <MessageCircle className="w-4 h-4" />
      {loading ? 'Sending…' : sent ? 'Sent!' : 'Send via WhatsApp'}
    </Button>
  );
}
