const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

async function callN8nWebhook(webhookUrl: string, payload: Record<string, unknown>): Promise<void> {
  if (!webhookUrl) {
    console.log('[WhatsApp] Webhook URL not configured, skipping:', JSON.stringify(payload).slice(0, 100));
    return;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': WEBHOOK_SECRET ?? '',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`n8n webhook failed: ${response.status} ${response.statusText}`);
  }
}

export async function sendSiteNoteNotification(
  note: {
    id: string;
    noteText: string | null;
    photoUrl: string | null;
    capturedAt: Date | string;
    latitude: string | null;
    longitude: string | null;
  },
  project: { id: string; name: string },
  authorName: string
): Promise<void> {
  try {
    await callN8nWebhook(process.env.N8N_SITE_NOTE_WEBHOOK ?? '', {
      noteId: note.id,
      projectId: project.id,
      projectName: project.name,
      noteText: note.noteText,
      photoUrl: note.photoUrl,
      capturedAt: note.capturedAt,
      gps: note.latitude ? `${note.latitude},${note.longitude}` : null,
      authorName,
    });
  } catch (err) {
    console.error('[WhatsApp] sendSiteNoteNotification failed:', err);
  }
}

export async function sendDrawingForApproval(
  drawing: {
    id: string;
    drawingType: string;
    version: number;
    fileUrl: string | null;
  },
  client: { name: string; phone: string },
  project: { id: string; name: string }
): Promise<void> {
  try {
    await callN8nWebhook(process.env.N8N_DRAWING_APPROVAL_WEBHOOK ?? '', {
      drawingId: drawing.id,
      projectId: project.id,
      projectName: project.name,
      drawingType: drawing.drawingType,
      version: drawing.version,
      fileUrl: drawing.fileUrl,
      clientName: client.name,
      clientPhone: client.phone,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    });
  } catch (err) {
    console.error('[WhatsApp] sendDrawingForApproval failed:', err);
  }
}

export async function sendInvoice(
  invoice: {
    id: string;
    invoiceNumber: string;
    description: string;
    totalAmount: string;
    dueDate: string | null;
  },
  client: { name: string; phone: string },
  projectName: string
): Promise<void> {
  try {
    await callN8nWebhook(process.env.N8N_INVOICE_WEBHOOK ?? '', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      description: invoice.description,
      totalAmount: invoice.totalAmount,
      dueDate: invoice.dueDate,
      clientName: client.name,
      clientPhone: client.phone,
      projectName,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    });
  } catch (err) {
    console.error('[WhatsApp] sendInvoice failed:', err);
  }
}
