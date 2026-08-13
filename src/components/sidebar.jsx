import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { handleLogout as apiLogout } from '../API/auth';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Rocket,
  Contact,
  Building2,
  Database,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

// Replace with your actual logo
import edcLogo from '../assets/edc-logo.png';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Initiatives', href: '/initiatives', icon: Rocket },
  { name: 'Contacts', href: '/contacts', icon: Contact },
  { name: 'Startups', href: '/startups', icon: Building2 },
  { name: 'Database', href: '/database', icon: Database },
];

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300/40';

export default function Sidebar({ isCollapsed = false, onToggle, mobileOpen = false, onMobileClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await apiLogout();
      auth.logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      setIsLoggingOut(false);
    }
  };
  console.log(auth);
  const displayName = auth.user?.username || 'Team Member';
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  const navContent = (
    <>
      {/* Navigation */}
      <nav className={`flex-1 space-y-0.5 overflow-y-auto py-3 ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.href ||
            location.pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onMobileClose}
              title={isCollapsed ? item.name : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex items-center rounded-control text-body transition-colors duration-150 ${FOCUS} ${
                isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2'
              } ${
                isActive
                  ? 'bg-accent-soft font-semibold text-accent-300'
                  : 'font-medium text-ink-muted hover:bg-muted hover:text-ink'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 animate-fade-in rounded-full bg-accent-300"
                />
              )}
              <Icon
                className={`h-[18px] w-[18px] shrink-0 transition-colors duration-150 ${
                  isActive ? 'text-accent-300' : 'text-ink-faint'
                }`}
              />
              {(!isCollapsed || mobileOpen) && (
                <span className="animate-fade-in truncate">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Signed-in user + logout */}
      <div className={`shrink-0 border-t border-line-subtle py-3 ${isCollapsed && !mobileOpen ? 'px-2' : 'px-3'}`}>
        {isCollapsed && !mobileOpen ? (
          <div className="flex flex-col items-center gap-2">
            <span
              title={displayName}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft font-display text-micro font-semibold text-accent-300"
            >
              {initial}
            </span>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Logout"
              aria-label="Logout"
              className={`flex h-7 w-7 items-center justify-center rounded-control text-ink-faint transition-colors duration-150 hover:bg-muted hover:text-ink disabled:opacity-60 ${FOCUS}`}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex animate-fade-in items-center gap-2.5 px-2 pb-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-micro font-semibold text-accent-300">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="text-micro text-ink-faint">Welcome back</p>
                <p className="truncate text-body font-medium text-ink">{displayName}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-meta text-ink-faint transition-colors duration-150 hover:bg-muted hover:text-ink disabled:opacity-60 ${FOCUS}`}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
            </button>
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex h-full shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 ease-out ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Brand */}
        <div
          className={`flex shrink-0 border-b border-line-subtle ${
            isCollapsed
              ? 'flex-col items-center gap-3 px-2 py-4'
              : 'items-start justify-between gap-2 px-5 py-5'
          }`}
        >
          {isCollapsed ? (
            <img
              src={edcLogo}
              alt="eDC IIT Delhi"
              className="h-7 w-auto object-contain brightness-0 invert opacity-90"
            />
          ) : (
            <div className="min-w-0 animate-fade-in">
              <img
                src={edcLogo}
                alt="eDC IIT Delhi"
                className="h-9 w-auto object-contain brightness-0 invert opacity-90"
              />
              <p className="mt-2 text-micro font-medium uppercase tracking-wide text-ink-faint">
                Operations Portal
              </p>
            </div>
          )}

          {onToggle && (
            <button
              onClick={onToggle}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-ink-faint transition duration-150 ease-exit hover:bg-muted hover:text-ink active:scale-90 active:duration-100 ${FOCUS}`}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onMobileClose}
          />

          {/* Slide Drawer */}
          <aside className="relative flex w-72 max-w-[80vw] flex-col border-r border-line bg-surface shadow-overlay animate-rise-in">
            <div className="flex items-center justify-between border-b border-line-subtle px-5 py-4">
              <div className="flex items-center gap-3">
                <img
                  src={edcLogo}
                  alt="eDC IIT Delhi"
                  className="h-7 w-auto object-contain brightness-0 invert opacity-90"
                />
                <p className="text-micro font-semibold uppercase tracking-wide text-ink-faint">
                  Portal Navigation
                </p>
              </div>
              <button
                onClick={onMobileClose}
                className="flex h-8 w-8 items-center justify-center rounded-control text-ink-faint hover:bg-muted hover:text-ink"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}

