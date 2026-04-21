'use client';

import Link from 'next/link';
import { Phone, Mail, MapPin, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { ClientDTO } from '@/lib/services/client.service';

interface ClientCardProps {
  client: ClientDTO;
}

export function ClientCard({ client }: ClientCardProps) {
  return (
    <Link href={`/clients/${client.id}`} className="block group">
      <Card className="bg-white border border-sand hover:border-sage transition-colors duration-150">
        <CardContent className="px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Avatar initial */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sage/15 flex items-center justify-center">
              <span className="text-sage font-bold text-sm uppercase">
                {client.name.charAt(0)}
              </span>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-charcoal truncate">{client.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 shrink-0" />
                  {client.phone}
                </span>
                {client.email && (
                  <span className="flex items-center gap-1 truncate max-w-[160px]">
                    <Mail className="w-3 h-3 shrink-0" />
                    {client.email}
                  </span>
                )}
                {client.address && (
                  <span className="flex items-center gap-1 truncate max-w-[180px]">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {client.address}
                  </span>
                )}
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-sage transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
