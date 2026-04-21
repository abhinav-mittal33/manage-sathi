import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { getProject } from '@/lib/services/project.service';
import { PageHeader } from '@/components/layout/page-header';
import { InvoiceList } from '@/components/invoices/invoice-list';
import { Button } from '@/components/ui/button';

interface Props { params: { id: string } }

export default async function ProjectInvoicesPage({ params }: Props) {
  const user = await requireAuth();
  const project = await getProject(params.id, user.firmId);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description={project.name}
        actions={
          <Link href={`/invoices/new?projectId=${params.id}`}>
            <Button className="bg-sage hover:bg-sage/90 text-white min-h-[44px]">+ New Invoice</Button>
          </Link>
        }
      />
      <InvoiceList projectId={params.id} />
    </div>
  );
}
