'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { NoteCaptureForm } from '@/components/site-notes/note-capture-form';
import { Button } from '@/components/ui/button';

interface Props {
  params: { id: string };
}

export default function NewProjectNotePage({ params }: Props) {
  const { id } = params;
  const router = useRouter();

  function handleSuccess() {
    router.push(`/projects/${id}/notes`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Site Note"
        actions={
          <Link href={`/projects/${id}/notes`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </Button>
          </Link>
        }
      />

      <div className="rounded-xl border border-sand bg-white px-4 py-5">
        <NoteCaptureForm projectId={id} onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
