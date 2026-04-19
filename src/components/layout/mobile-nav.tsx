'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: '⊞' },
  { href: '/clients', label: 'Clients', icon: '👥' },
  { href: '/site-diary', label: 'Site', icon: '📸' },
  { href: '/invoices', label: 'Invoices', icon: '📄' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sage flex items-center justify-center text-white text-xs">
            🏗️
          </div>
          <span className="font-bold text-charcoal text-sm">Manage Sathi</span>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="flex">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium transition-colors ${
                  active ? 'text-sage' : 'text-charcoal/50'
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
        {/* Safe area spacer for iOS */}
        <div className="h-safe-area-bottom bg-card" />
      </nav>

      {/* Bottom padding so content isn't hidden under mobile nav */}
      <div className="md:hidden h-16" />
    </>
  );
}
