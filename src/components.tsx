import {
  AlertCircle,
  ArrowRight,
  CarFront,
  ChevronLeft,
  CircleHelp,
  ClipboardCheck,
  Home,
  LayoutDashboard,
  LoaderCircle,
  LogIn,
  LogOut,
  Trophy,
  UserPlus,
  Search,
  Highlighter,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, NavLink, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { authAPI } from './api/auth';

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
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 font-bold text-ocean"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ocean text-white">
              <Trophy size={20} />
            </span>
            RijFiks
          </Link>
          <nav className="flex items-center gap-3 text-sm font-medium">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? 'text-ocean' : 'text-slate-500'
              }
            >
              <Home className="inline mr-1" size={16} />
              Learn
            </NavLink>
            <NavLink
              to="/scenarios"
              className={({ isActive }) =>
                `hidden md:inline ${isActive ? 'text-ocean' : 'text-slate-500'}`
              }
            >
              <CarFront className="inline mr-1" size={16} />
              Scenarios
            </NavLink>
            <NavLink
              to="/exams"
              className={({ isActive }) =>
                `hidden md:inline ${isActive ? 'text-ocean' : 'text-slate-500'}`
              }
            >
              <ClipboardCheck className="inline mr-1" size={16} />
              Exam
            </NavLink>
            <NavLink to="/search" aria-label="Search lessons" className={({isActive})=>isActive?'text-ocean':'text-slate-500'}><Search size={17}/></NavLink>
            <span className="hidden text-slate-400 lg:inline">
              <CircleHelp className="inline mr-1" size={16} />
              CBR B
            </span>
            {learner ? (
              <>
                <NavLink to="/highlights" aria-label="My highlights" className={({isActive})=>`hidden sm:inline ${isActive?'text-ocean':'text-slate-500'}`}><Highlighter size={17}/></NavLink>
                {learner.role === 'admin' && (
                  <NavLink
                    to="/admin"
                    className="inline-flex items-center gap-1 rounded-lg bg-ink px-3 py-2 text-white"
                  >
                    <LayoutDashboard size={16} />
                    <span className="hidden sm:inline">Admin</span>
                  </NavLink>
                )}
                <NavLink
                  to="/dashboard"
                  className="hidden text-ocean sm:inline"
                >
                  {learner.displayName}
                </NavLink>
                <button
                  aria-label="Log out"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                  className="inline-flex items-center gap-1 rounded-lg border border-ocean px-2 py-2 text-ocean hover:bg-sky"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-ocean"
                >
                  <LogIn size={16} />
                  <span className="hidden sm:inline">Log in</span>
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1 rounded-lg bg-ocean px-3 py-2 text-white"
                >
                  <UserPlus size={16} />
                  <span className="hidden sm:inline">Sign up</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
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
