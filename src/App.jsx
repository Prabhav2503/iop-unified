import { useState, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/sidebar';
import edcLogo from './assets/edc-logo.png';
import LoginPage from './pages/login';
import DashboardPage from './pages/dashboard';
import CalendarPage from './pages/calendar';
import Team from './pages/team';
import TeamMemberDetail from './components/teamdetails';
import InitiativesPage from './pages/initiatives';
import ContactsPage from './pages/contacts';
import StartupsPage from './pages/startups';
import DatabasePage from './pages/database';
import ResourcesPage from './pages/resources';

function ProtectedRoute({ children }) {
  const { isAuthenticated, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-canvas text-ink-muted">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppShell() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-full flex-col md:flex-row bg-canvas overflow-hidden">
      {/* Mobile Header Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-4 md:hidden">
        <div className="flex items-center gap-2.5">
          <img
            src={edcLogo}
            alt="eDC IIT Delhi"
            className="h-7 w-auto object-contain brightness-0 invert opacity-90"
          />
          <span className="text-micro font-semibold uppercase tracking-wide text-ink-faint">
            Operations Portal
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-control border border-line bg-canvas text-ink-muted hover:bg-muted hover:text-ink"
          aria-label="Open Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">

          {/* The key makes each navigation a fresh mount, which is what lets the
              incoming page play its 200ms rise-in. The route table below is
              untouched — this wrapper is presentation only, and the sidebar
              stays put so only the pane that actually changed moves. */}
          <div key={location.pathname} className="animate-rise-in">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/team" element={<Team />} />
              <Route path="/team/:id" element={<TeamMemberDetail />} />
              <Route path="/initiatives" element={<InitiativesPage />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/startups" element={<StartupsPage />} />
              <Route path="/database" element={<DatabasePage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

