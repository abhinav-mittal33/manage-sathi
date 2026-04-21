'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createProjectSchema, type CreateProjectInput } from '@/lib/validations/project';
import type { ClientDTO } from '@/lib/services/client.service';

interface ProjectFormProps {
  clients: ClientDTO[];
  defaultValues?: Partial<CreateProjectInput>;
  projectId?: string;
  onSuccess?: (projectId: string) => void;
}

export function ProjectForm({ clients, defaultValues, projectId, onSuccess }: ProjectFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      status: 'active',
      currentPhase: 'drawing',
      ...defaultValues,
    },
  });

  const status = watch('status');
  const currentPhase = watch('currentPhase');
  const clientId = watch('clientId');

  async function onSubmit(data: CreateProjectInput) {
    setServerError(null);
    try {
      const url = projectId ? `/api/v1/projects/${projectId}` : '/api/v1/projects';
      const method = projectId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        setServerError(json?.error?.message ?? 'Something went wrong');
        return;
      }

      const id: string = json.data?.id ?? projectId;
      if (onSuccess) {
        onSuccess(id);
      } else {
        router.push(`/projects/${id}`);
        router.refresh();
      }
    } catch {
      setServerError('Network error — please try again');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {serverError}
        </p>
      )}

      {/* Project name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Project name *</Label>
        <Input id="name" placeholder="Sharma Residence" {...register('name')} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      {/* Client */}
      <div className="space-y-1.5">
        <Label htmlFor="clientId">Client *</Label>
        <Select
          value={clientId ?? ''}
          onValueChange={(v) => { if (v) setValue('clientId', v, { shouldValidate: true }); }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.clientId && <p className="text-xs text-red-600">{errors.clientId.message}</p>}
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="addressLine1">Site address</Label>
        <Input id="addressLine1" placeholder="Plot no / street" {...register('addressLine1')} />
        <Input placeholder="Locality / area" {...register('addressLine2')} className="mt-2" />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Input placeholder="City" {...register('city')} />
          <Input placeholder="State" {...register('state')} />
        </div>
        <Input placeholder="Pincode (6 digits)" {...register('pincode')} className="mt-2" />
        {errors.pincode && <p className="text-xs text-red-600">{errors.pincode.message}</p>}
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select
          value={status}
          onValueChange={(v) => setValue('status', v as CreateProjectInput['status'], { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Phase */}
      <div className="space-y-1.5">
        <Label>Current phase</Label>
        <Select
          value={currentPhase}
          onValueChange={(v) => setValue('currentPhase', v as CreateProjectInput['currentPhase'], { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="drawing">Drawings</SelectItem>
            <SelectItem value="building">Building</SelectItem>
            <SelectItem value="finishing">Finishing</SelectItem>
            <SelectItem value="electrical">Electrical</SelectItem>
            <SelectItem value="plumbing">Plumbing</SelectItem>
            <SelectItem value="door_window">Door / Window</SelectItem>
            <SelectItem value="railing">Railing</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-sage hover:bg-sage/90 text-white min-h-[44px]"
      >
        {isSubmitting ? 'Saving…' : projectId ? 'Save changes' : 'Create project'}
      </Button>
    </form>
  );
}
