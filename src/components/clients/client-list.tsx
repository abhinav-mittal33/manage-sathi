'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientCard } from './client-card';
import type { ClientDTO } from '@/lib/services/client.service';

export function ClientList() {
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = query ? `?search=${encodeURIComponent(query)}` : '';
      const res = await fetch(`/api/v1/clients${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Failed to load clients');
      setClients(json.data as ClientDTO[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search by 300ms
  useEffect(() => {
    const timer = setTimeout(() => fetchClients(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchClients]);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 min-h-[44px] border-sand focus-visible:ring-sage"
        />
      </div>

      {/* States */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={() => fetchClients(search)}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && clients.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <div className="w-12 h-12 rounded-full bg-sand/40 flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-sage" />
          </div>
          <p className="text-charcoal font-medium">
            {search ? 'No clients match your search' : 'No clients yet'}
          </p>
          {!search && (
            <Link href="/clients/new">
              <Button className="bg-sage hover:bg-sage/90 text-white min-h-[44px]">
                Add your first client
              </Button>
            </Link>
          )}
        </div>
      )}

      {!isLoading && !error && clients.length > 0 && (
        <div className="space-y-2">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
          <p className="text-xs text-muted-foreground text-center pt-1">
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
