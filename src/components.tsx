import {
  AlertCircle,
  ArrowRight,
  CarFront,
  ChevronLeft,
  ClipboardCheck,
  Home,
  LayoutDashboard,
  LoaderCircle,
  LogIn,
  LogOut,
  Trophy,
  Target,
  Search,
  Settings,
  Signpost,
  Menu,
  X,
  MoreHorizontal,
  ChevronDown,
  Bookmark,
  User,
  School,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { authAPI, type Learner } from './api/auth';
import { useFeatureFlags } from './use-feature-flags';
import type { FeatureKey } from './api/features';

export function Shell({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { data: learner } = useQuery({
    queryKey: ['me'],
    queryFn: authAPI.me,
    retry: false,
    staleTime: 60_000,
  });
  const logout = useMutation({
    mutationFn: authAPI.logout,
    onSuccess: () => queryClient.removeQueries({ queryKey: ['me'] }),
  });
  const adminPage =
    learner?.role === 'admin' && location.pathname.startsWith('/admin');
  const immersiveExam = /^\/exams\/[^/]+$/.test(location.pathname);
  useEffect(() => {
    if (!learner) return;
    try {
      const saved = JSON.parse(
        localStorage.getItem(`rijfiks.preferences.${learner.id}`) ?? '{}',
      );
      const dark =
        saved.theme === 'dark' ||
        (saved.theme !== 'light' &&
          matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.dataset.readingFont = saved.fontSize ?? 'medium';
      document.documentElement.dataset.readingSpacing =
        saved.lineSpacing ?? 'relaxed';
      document.documentElement.dataset.readingWidth =
        saved.readingWidth ?? 'normal';
      document.documentElement.dataset.readingMode = String(
        saved.readingMode ?? false,
      );
    } catch {
      /* Keep default visual settings when stored preferences are invalid. */
    }
  }, [learner]);
  if (immersiveExam) return <>{children}</>;
  // AdminLayout owns navigation in Studio. Rendering the learner header here
  // used to duplicate the same navigation above the sidebar.
  if (adminPage)
    return (
      <div className="min-h-screen bg-slate-100 text-ink">
        <main className="admin-app-frame">{children}</main>
      </div>
    );
  return (
    <div className="min-h-screen bg-slate-50 text-ink">
      <LearnerHeader
        learner={learner}
        logout={() => logout.mutate()}
        loggingOut={logout.isPending}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

const primaryNav = [
  {
    to: '/',
    label: 'Learn',
    icon: Home,
    features: ['learning_roadmap'] as FeatureKey[],
  },
  {
    to: '/practice',
    label: 'Practice',
    icon: Target,
    features: ['practice_hub'] as FeatureKey[],
  },
  {
    to: '/traffic-signs',
    label: 'Signs',
    icon: Signpost,
    features: ['traffic_signs', 'dashboard_symbols'] as FeatureKey[],
  },
  {
    to: '/exams',
    label: 'Exam',
    icon: ClipboardCheck,
    features: ['mock_exams'] as FeatureKey[],
  },
];
const secondaryNav = [
  {
    to: '/scenarios',
    label: 'Scenarios',
    icon: CarFront,
    features: ['scenarios'] as FeatureKey[],
  },
  {
    to: '/dashboard',
    label: 'My progress',
    icon: LayoutDashboard,
    features: ['learner_dashboard'] as FeatureKey[],
  },
  {
    to: '/highlights',
    label: 'Saved items',
    icon: Bookmark,
    features: ['saved_items'] as FeatureKey[],
  },
  {
    to: '/search',
    label: 'Search lessons',
    icon: Search,
    features: ['global_search'] as FeatureKey[],
  },
  {
    to: '/driving-schools',
    label: 'Driving schools',
    icon: School,
    features: ['driving_school_finder'] as FeatureKey[],
  },
];

function LearnerHeader({
  learner,
  logout,
  loggingOut,
}: {
  learner?: Learner;
  logout: () => void;
  loggingOut: boolean;
}) {
  const featureFlags = useFeatureFlags();
  const enabled = (features: FeatureKey[]) =>
    features.some((feature) => featureFlags.data?.[feature] !== false);
  const visiblePrimary = primaryNav
    .filter((item) => enabled(item.features))
    .map((item) =>
      item.to === '/traffic-signs' && featureFlags.data?.traffic_signs === false
        ? { ...item, to: '/dashboard-symbols' }
        : item,
    );
  const visibleSecondary = secondaryNav.filter((item) =>
    enabled(item.features),
  );
  const settingsEnabled = featureFlags.data?.account_settings !== false;
  const homeDestination =
    visiblePrimary[0]?.to ?? (settingsEnabled ? '/settings' : '/login');
  const [moreOpen, setMoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setMoreOpen(false);
        setUserOpen(false);
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMoreOpen(false);
        setUserOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', key);
    };
  }, []);
  const close = () => {
    setMoreOpen(false);
    setUserOpen(false);
    setMobileOpen(false);
  };
  return (
    <header
      ref={root}
      className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur"
    >
      <div className="header-inner mx-auto max-w-6xl px-4">
          <Link
            to={homeDestination}
          onClick={close}
          className="flex shrink-0 items-center gap-2 font-bold text-ocean"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ocean text-white">
            <Trophy size={20} />
          </span>
          RijFiks
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 md:flex"
        >
          {visiblePrimary.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `header-nav-link ${isActive ? 'header-nav-active' : ''}`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
          {visibleSecondary.length > 0 && (
            <div className="relative">
              <button
                type="button"
                className={`header-nav-link ${moreOpen ? 'header-nav-active' : ''}`}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setMoreOpen((v) => !v);
                  setUserOpen(false);
                }}
              >
                <MoreHorizontal size={17} />
                More
                <ChevronDown size={14} />
              </button>
              {moreOpen && (
                <div role="menu" className="header-menu">
                  {visibleSecondary.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      role="menuitem"
                      key={to}
                      to={to}
                      onClick={close}
                      className="header-menu-item"
                    >
                      <Icon size={16} />
                      {label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <span className="text-xs font-semibold text-slate-500">CBR B</span>
          {learner ? (
            <div className="relative">
              <button
                type="button"
                className="header-user"
                aria-expanded={userOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setUserOpen((v) => !v);
                  setMoreOpen(false);
                }}
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ocean text-sm font-bold text-white">
                  {learner.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-28 truncate text-sm font-semibold">
                  {learner.displayName}
                </span>
                <ChevronDown size={15} />
              </button>
              {userOpen && (
                <div role="menu" className="header-menu right-0">
                  {settingsEnabled && (
                    <>
                      <Link
                        role="menuitem"
                        to="/settings"
                        onClick={close}
                        className="header-menu-item"
                      >
                        <User size={16} />
                        My profile
                      </Link>
                      <Link
                        role="menuitem"
                        to="/settings"
                        onClick={close}
                        className="header-menu-item"
                      >
                        <Settings size={16} />
                        Settings
                      </Link>
                    </>
                  )}
                  {learner.role === 'admin' && (
                    <Link
                      role="menuitem"
                      to="/admin"
                      onClick={close}
                      className="header-menu-item"
                    >
                      <LayoutDashboard size={16} />
                      Admin
                    </Link>
                  )}
                  <button
                    role="menuitem"
                    className="header-menu-item w-full"
                    onClick={() => {
                      logout();
                      close();
                    }}
                    disabled={loggingOut}
                  >
                    <LogOut size={16} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="header-nav-link">
                <LogIn size={16} />
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-ocean px-3 py-2 text-sm font-bold text-white"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-lg text-ocean md:hidden"
        >
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </div>
      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t bg-white px-4 pb-4 pt-2 md:hidden"
        >
          <div className="mx-auto grid max-w-6xl gap-1">
            {[...visiblePrimary, ...visibleSecondary].map(
              ({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={close}
                  className={({ isActive }) =>
                    `header-mobile-link ${isActive ? 'header-nav-active' : ''}`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ),
            )}
            {learner && (
              <>
                {settingsEnabled && (
                  <Link
                    to="/settings"
                    onClick={close}
                    className="header-mobile-link"
                  >
                    <User size={18} />
                    My profile & settings
                  </Link>
                )}
                {learner.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={close}
                    className="header-mobile-link"
                  >
                    <LayoutDashboard size={18} />
                    Admin
                  </Link>
                )}
                <button
                  className="header-mobile-link"
                  onClick={() => {
                    logout();
                    close();
                  }}
                  disabled={loggingOut}
                >
                  <LogOut size={18} />
                  Log out
                </button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

export function Loading() {
  return (
    <div className="grid min-h-48 place-items-center text-slate-500">
      <LoaderCircle className="animate-spin" />{' '}
      <span className="sr-only">Loading</span>
    </div>
  );
}
export function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800"
    >
      <AlertCircle className="mr-2 inline" size={18} />
      {message}
    </div>
  );
}
export function BackLink({
  to,
  children = 'Back',
}: PropsWithChildren<{ to: string }>) {
  return (
    <Link
      to={to}
      className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-ocean hover:underline"
    >
      <ChevronLeft size={17} />
      {children}
    </Link>
  );
}
export function PrimaryLink({
  to,
  children,
}: PropsWithChildren<{ to: string }>) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-xl bg-ocean px-4 py-3 font-bold text-white shadow-sm transition hover:bg-teal-800"
    >
      {children}
      <ArrowRight size={18} />
    </Link>
  );
}
