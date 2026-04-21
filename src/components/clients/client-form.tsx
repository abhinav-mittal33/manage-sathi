'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClientSchema, type CreateClientInput } from '@/lib/validations/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ClientFormProps {
  defaultValues?: Partial<CreateClientInput>;
  onSubmit: (data: CreateClientInput) => Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function ClientForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save Client',
  isLoading = false,
}: ClientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-charcoal font-medium">
          Full Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          placeholder="Ramesh Sharma"
          className="min-h-[44px] border-sand focus-visible:ring-sage"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="phone" className="text-charcoal font-medium">
          Mobile Number <span className="text-red-500">*</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="9876543210"
          className="min-h-[44px] border-sand focus-visible:ring-sage"
          {...register('phone')}
        />
        {errors.phone && (
          <p className="text-sm text-red-600">{errors.phone.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-charcoal font-medium">
          Email <span className="text-muted-foreground text-xs font-normal">(optional)</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="ramesh@example.com"
          className="min-h-[44px] border-sand focus-visible:ring-sage"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="address" className="text-charcoal font-medium">
          Address <span className="text-muted-foreground text-xs font-normal">(optional)</span>
        </Label>
        <Textarea
          id="address"
          placeholder="Plot 12, Sector 4, Pune 411001"
          rows={3}
          className="border-sand focus-visible:ring-sage resize-none"
          {...register('address')}
        />
        {errors.address && (
          <p className="text-sm text-red-600">{errors.address.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full min-h-[44px] bg-sage hover:bg-sage/90 text-white font-semibold"
      >
        {isLoading ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}
