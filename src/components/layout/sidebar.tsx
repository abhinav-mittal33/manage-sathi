'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/clients', label: 'Clients', icon: '👥' },
  { href: '/site-diary', label: 'Site Diary', icon: '📸' },
  { href: '/invoices', label: 'Invoices', icon: '📄' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 bg-card border-r border-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-sage flex items-center justify-center text-white text-sm">
          🏗️
        </div>
        <span className="font-bold text-charcoal text-sm">Manage Sathi</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-sage/15 text-sage'
                  : 'text-charcoal/70 hover:bg-sand/30 hover:text-charcoal'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-2 pb-4 border-t border-border pt-4">
        <form action="/api/v1/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-charcoal/60 hover:bg-sand/30 hover:text-charcoal transition-colors"
          >
            <span>↩</span> Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
