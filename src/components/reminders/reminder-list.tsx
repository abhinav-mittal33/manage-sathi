'use client';

import { useState } from 'react';
import { Bell, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReminderForm } from './reminder-form';
import type { ReminderRow } from '@/lib/dal/reminder.dal';

const TYPE_LABELS: Record<string, string> = {
  drawing_deadline: 'Drawing',
  project_completion: 'Completion',
  client_meeting: 'Meeting',
  general: 'General',
};

const TYPE_COLORS: Record<string, string> = {
  drawing_deadline: 'bg-blue-50 text-blue-700',
  project_completion: 'bg-[#8A9A7B]/20 text-[#4d6040]',
  client_meeting: 'bg-[#D1BFA7]/40 text-[#6b5a45]',
  general: 'bg-gray-100 text-gray-600',
};

function isOverdue(dueDate: string): boolean {
  return dueDate < new Date().toISOString().slice(0, 10);
}

function formatDueDate(dueDate: string): string {
  const [year, month, day] = dueDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface ReminderListProps {
  projectId: string;
  initialReminders: ReminderRow[];
}

export function ReminderList({ projectId, initialReminders }: ReminderListProps) {
  const [items, setItems] = useState<ReminderRow[]>(initialReminders);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleToggle(id: string, currentValue: boolean) {
    setItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isCompleted: !currentValue } : r))
    );
    try {
      await fetch(`/api/v1/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !currentValue }),
      });
    } catch {
      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isCompleted: currentValue } : r))
      );
    }
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch(`/api/v1/reminders/${id}`, { method: 'DELETE' });
    } catch {
      // Reloading would fix state, but keep it removed to avoid flicker
    }
  }

  function handleCreated() {
    setDialogOpen(false);
    // Refresh the list from server
    fetch(`/api/v1/reminders?projectId=${projectId}&limit=20`)
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setItems(body.data);
      })
      .catch(() => {});
  }

  const pending = items.filter((r) => !r.isCompleted);
  const completed = items.filter((r) => r.isCompleted);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-[#2C2A26]">
          <Bell className="w-4 h-4 text-[#8A9A7B]" />
          Reminders
          {pending.length > 0 && (
            <span className="ml-1 rounded-full bg-[#8A9A7B]/20 text-[#4d6040] px-1.5 py-0.5 text-[10px] font-medium">
              {pending.length}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs border-[#D1BFA7] text-[#2C2A26]"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="w-3 h-3" />
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          No reminders yet. Add a deadline or milestone.
        </p>
      ) : (
        <div className="space-y-1.5">
          {pending.map((reminder) => {
            const overdue = isOverdue(reminder.dueDate as string);
            return (
              <div
                key={reminder.id}
                className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${
                  overdue ? 'border-red-200 bg-red-50' : 'border-[#D1BFA7] bg-white'
                }`}
              >
                <Checkbox
                  checked={false}
                  onCheckedChange={() => handleToggle(reminder.id, false)}
                  className="mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-tight ${overdue ? 'text-red-800' : 'text-[#2C2A26]'}`}>
                    {reminder.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[reminder.reminderType] ?? TYPE_COLORS.general}`}
                    >
                      {TYPE_LABELS[reminder.reminderType] ?? reminder.reminderType}
                    </span>
                    <span className={`text-[11px] ${overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                      {overdue ? 'Overdue · ' : ''}{formatDueDate(reminder.dueDate as string)}
                    </span>
                  </div>
                  {reminder.notes && (
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{reminder.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(reminder.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5"
                  aria-label="Delete reminder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {completed.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer select-none">
                {completed.length} completed
              </summary>
              <div className="space-y-1.5 mt-1.5">
                {completed.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2 opacity-60"
                  >
                    <Checkbox
                      checked
                      onCheckedChange={() => handleToggle(reminder.id, true)}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-through text-muted-foreground leading-tight">
                        {reminder.title}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(reminder.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5"
                      aria-label="Delete reminder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reminder</DialogTitle>
          </DialogHeader>
          <ReminderForm
            projectId={projectId}
            onSuccess={handleCreated}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
