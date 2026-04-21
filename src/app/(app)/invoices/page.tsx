import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { PageHeader } from '@/components/layout/page-header';
import { InvoiceList } from '@/components/invoices/invoice-list';
import { Button } from '@/components/ui/button';

export default async function InvoicesPage() {
  await requireAuth();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        actions={
          <Link href="/invoices/new">
            <Button className="bg-sage hover:bg-sage/90 text-white min-h-[44px]">+ New Invoice</Button>
          </Link>
        }
      />
      <InvoiceList />
    </div>
  );
}
