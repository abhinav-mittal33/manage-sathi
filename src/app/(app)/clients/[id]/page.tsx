'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, Phone, Mail, MapPin, FolderOpen, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import type { ClientDTO } from '@/lib/services/client.service';

interface ClientDetailPageProps {
  params: { id: string };
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = params;
  const router = useRouter();

  const [client, setClient] = useState<ClientDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadClient() {
      try {
        const res = await fetch(`/api/v1/clients/${id}`);
        const json = await res.json();
        if (res.status === 404) {
          setError('Client not found');
          return;
        }
        if (!json.success) throw new Error(json.error?.message ?? 'Failed to load client');
        setClient(json.data as ClientDTO);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    }
    loadClient();
  }, [id]);

  async function handleDelete() {
    if (!confirm('Delete this client? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/clients/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Failed to delete client');
      router.push('/clients');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete client');
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-lg">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[180px] w-full rounded-xl" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="space-y-4">
        <Link href="/clients">
          <Button variant="ghost" size="sm" className="gap-2 text-charcoal">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>
        <p className="text-red-600 font-medium">{error ?? 'Client not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/clients">
          <Button variant="ghost" size="icon" className="text-charcoal hover:bg-sand/40 h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
            <span className="sr-only">Back to clients</span>
          </Button>
        </Link>
        <PageHeader
          title={client.name}
          actions={
            <div className="flex items-center gap-2">
              <Link href={`/clients/${id}/edit`}>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 border-sand hover:border-sage hover:bg-sage/10"
                >
                  <Pencil className="w-4 h-4" />
                  <span className="sr-only">Edit client</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-sand hover:border-red-400 hover:bg-red-50 hover:text-red-600"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4" />
                <span className="sr-only">Delete client</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* Info card */}
      <Card className="border-sand">
        <CardContent className="px-5 py-5 space-y-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-sage/15 flex items-center justify-center shrink-0">
              <span className="text-sage font-bold text-xl uppercase">{client.name.charAt(0)}</span>
            </div>
            <div>
              <p className="text-lg font-bold text-charcoal">{client.name}</p>
              <p className="text-xs text-muted-foreground">
                Added {new Date(client.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="border-t border-sand/60" />

          {/* Contact info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-sage shrink-0" />
              <a
                href={`tel:${client.phone}`}
                className="text-charcoal hover:text-sage transition-colors"
              >
                {client.phone}
              </a>
            </div>
            {client.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-sage shrink-0" />
                <a
                  href={`mailto:${client.email}`}
                  className="text-charcoal hover:text-sage transition-colors truncate"
                >
                  {client.email}
                </a>
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-sage shrink-0 mt-0.5" />
                <span className="text-charcoal">{client.address}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Projects shortcuts */}
      <div className="flex flex-col gap-2">
        <Link href={`/projects/new?clientId=${id}`}>
          <Button
            className="w-full min-h-[44px] bg-sage hover:bg-sage/90 text-white gap-2 border-0"
          >
            <PlusCircle className="w-4 h-4" />
            New Project for {client.name}
          </Button>
        </Link>
        <Link href={`/projects?clientId=${id}`}>
          <Button
            variant="outline"
            className="w-full min-h-[44px] border-sand hover:border-sage hover:bg-sage/10 gap-2 text-charcoal"
          >
            <FolderOpen className="w-4 h-4 text-sage" />
            View Projects for {client.name}
          </Button>
        </Link>
      </div>
    </div>
  );
}
