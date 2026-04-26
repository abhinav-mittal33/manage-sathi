'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createReminderSchema, type CreateReminderInput } from '@/lib/validations/reminder';

interface ReminderFormProps {
  projectId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  drawing_deadline: 'Drawing Deadline',
  project_completion: 'Project Completion',
  client_meeting: 'Client Meeting',
  general: 'General',
};

export function ReminderForm({ projectId, onSuccess, onCancel }: ReminderFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateReminderInput>({
    resolver: zodResolver(createReminderSchema),
    defaultValues: {
      projectId,
      reminderType: 'general',
    },
  });

  const reminderType = watch('reminderType');

  async function onSubmit(data: CreateReminderInput) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? 'Failed to create reminder');
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('projectId')} />

      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g. Submit structural drawing"
          {...register('title')}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select
          value={reminderType}
          onValueChange={(v) =>
            setValue('reminderType', v as CreateReminderInput['reminderType'])
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dueDate">Due Date</Label>
        <Input id="dueDate" type="date" {...register('dueDate')} />
        {errors.dueDate && (
          <p className="text-xs text-destructive">{errors.dueDate.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Any additional details..."
          rows={3}
          {...register('notes')}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="bg-[#8A9A7B] hover:bg-[#7a8a6b] text-white border-0"
        >
          {submitting ? 'Saving…' : 'Save Reminder'}
        </Button>
      </div>
    </form>
  );
}
