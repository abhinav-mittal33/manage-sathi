'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), pin: pin.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message ?? 'Invalid credentials');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-plaster flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sage text-white text-2xl mb-4">
            🏗️
          </div>
          <h1 className="text-2xl font-bold text-charcoal">Manage Sathi</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your workspace</p>
        </div>

        {/* Login form */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 99999 99999"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-charcoal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sage text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                PIN
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="4–6 digit PIN"
                maxLength={6}
                required
                inputMode="numeric"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-charcoal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sage text-base tracking-widest"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-sage text-white font-semibold hover:bg-sage/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Manage Sathi · Architecture Studio Management
        </p>
      </div>
    </div>
  );
}
