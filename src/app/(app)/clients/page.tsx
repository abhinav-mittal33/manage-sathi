import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ClientList } from '@/components/clients/client-list';

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage your firm's clients"
        actions={
          <Link href="/clients/new">
            <Button className="bg-sage hover:bg-sage/90 text-white min-h-[44px] gap-2">
              <UserPlus className="w-4 h-4" />
              New Client
            </Button>
          </Link>
        }
      />
      <ClientList />
    </div>
  );
}
