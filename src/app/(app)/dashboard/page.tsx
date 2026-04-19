import { PageHeader } from '@/components/layout/page-header';

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your projects and activity"
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {[
          { label: 'Active Projects', value: '—', color: 'bg-sage/10 text-sage' },
          { label: 'Pending Drawings', value: '—', color: 'bg-sand/30 text-charcoal' },
          { label: 'Pending Invoices', value: '—', color: 'bg-sand/30 text-charcoal' },
          { label: 'Site Notes Today', value: '—', color: 'bg-plaster border border-border text-charcoal' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl p-4 ${stat.color}`}>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm mt-1 opacity-80">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Projects placeholder */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-charcoal mb-4">Recent Projects</h2>
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          <p className="text-4xl mb-3">🏗️</p>
          <p className="font-medium">No projects yet</p>
          <p className="text-sm mt-1">Create your first project to get started</p>
          <a
            href="/clients/new"
            className="inline-flex items-center justify-center mt-4 px-4 py-2 rounded-lg bg-sage text-white text-sm font-medium hover:bg-sage/90 transition-colors"
          >
            Add Client & Project
          </a>
        </div>
      </div>
    </div>
  );
}
