import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Scale, LayoutDashboard, Calendar, User, Menu, X } from 'lucide-react';

export function Navbar() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => router.pathname === path;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3 md:gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="bg-slate-900 p-2 rounded-lg">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg md:text-xl font-bold text-slate-900">Case Manager</span>
            </Link>

            <div className="hidden md:flex space-x-1">
              <Link
                href="/dashboard"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  isActive('/dashboard')
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="font-medium">Dashboard</span>
              </Link>

              <Link
                href="/calendar"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  isActive('/calendar')
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Calendar</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex md:hidden items-center justify-center w-10 h-10 rounded-lg border border-slate-300 hover:bg-slate-50 transition"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5 text-slate-700" /> : <Menu className="w-5 h-5 text-slate-700" />}
            </button>
            <div className="relative hidden md:block">
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-full border border-slate-300 hover:bg-slate-50 transition"
                aria-haspopup="menu"
                aria-expanded={open ? 'true' : 'false'}
              >
                <User className="w-5 h-5 text-slate-700" />
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                  <button
                    className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setOpen(false);
                      router.push('/profile');
                    }}
                  >
                    Profile
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-red-700 hover:bg-red-50 flex items-center gap-2"
                    onClick={async () => {
                      setOpen(false);
                      await signOut();
                      router.push('/login');
                    }}
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile panel */}
        {mobileOpen && (
          <div className="md:hidden pb-3 border-t border-slate-200">
            <div className="pt-3 space-y-1">
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                  isActive('/dashboard')
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="font-medium">Dashboard</span>
              </Link>
              <Link
                href="/calendar"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                  isActive('/calendar')
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Calendar</span>
              </Link>
              <div className="pt-2">
                <button
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg"
                  onClick={() => {
                    setMobileOpen(false);
                    router.push('/profile');
                  }}
                >
                  Profile
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-red-700 hover:bg-red-50 rounded-lg flex items-center gap-2"
                  onClick={async () => {
                    setMobileOpen(false);
                    await signOut();
                    router.push('/login');
                  }}
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}


