import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG = {
  active: { label: 'Active', className: 'bg-sage text-white border-sage' },
  on_hold: { label: 'On Hold', className: 'bg-sand text-charcoal border-sand' },
  completed: { label: 'Completed', className: 'bg-charcoal text-white border-charcoal' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-muted' },
} as const;

type ProjectStatus = keyof typeof STATUS_CONFIG;

interface ProjectStatusBadgeProps {
  status: string;
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const config = STATUS_CONFIG[status as ProjectStatus] ?? STATUS_CONFIG.active;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
