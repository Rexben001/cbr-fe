import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, CarFront, Flame, GraduationCap, Trophy } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authAPI } from './api/auth';
import { APIError } from './api/client';
import { PrimaryLink } from './components';
import { LearningPath } from './learning-path';

function AuthForm({ register }: { register: boolean }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      register
        ? authAPI.register(email, name, password)
        : authAPI.login(email, password),
    onSuccess: (user) => {
      client.setQueryData(['me'], user);
      navigate('/dashboard');
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (register && password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    setMessage('');
    mutation.mutate();
  };
  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl bg-white shadow-lg md:grid-cols-[.9fr_1.1fr]">
      <aside className="hidden bg-ink p-9 text-white md:block">
        <Trophy className="text-sun" size={34} />
        <p className="mt-8 text-sm font-bold tracking-widest text-sun">
          RIJFIKS
        </p>
        <h1 className="mt-3 text-3xl font-bold">
          Pass theory with calm, practical practice.
        </h1>
        <p className="mt-4 leading-7 text-slate-300">
          Learn road rules, make decisions in scenarios, and prepare with timed
          exams.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-slate-200">
          <li>✓ Structured learning path</li>
          <li>✓ Clear rule explanations</li>
          <li>✓ XP, streaks and practice exams</li>
        </ul>
      </aside>
      <div className="p-7 sm:p-10">
        <p className="font-bold text-ocean">
          {register ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          {register ? 'Start your learning path' : 'Continue learning'}
        </h1>
        <p className="mt-2 text-slate-600">
          {register
            ? 'Create an account to save progress and earn XP.'
            : 'Log in to pick up where you left off.'}
        </p>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          {register && (
            <label className="admin-label">
              Display name
              <input
                required
                minLength={2}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="admin-field"
              />
            </label>
          )}
          <label className="admin-label">
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="admin-field"
            />
          </label>
          <label className="admin-label">
            Password
            <input
              required
              minLength={12}
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="admin-field"
            />
          </label>
          {register && (
            <label className="admin-label">
              Confirm password
              <input
                required
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="admin-field"
              />
            </label>
          )}
          {(message || mutation.error) && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
            >
              {message ||
                (mutation.error instanceof APIError
                  ? mutation.error.message
                  : 'Something went wrong.')}
            </p>
          )}
          <button
            disabled={mutation.isPending}
            className="admin-primary-button w-full justify-center"
          >
            {mutation.isPending
              ? 'Please wait…'
              : register
                ? 'Create account'
                : 'Log in'}
          </button>
        </form>
        <p className="mt-6 text-sm text-slate-600">
          {register ? 'Already have an account? ' : 'New to RijFiks? '}
          <Link
            className="font-bold text-ocean hover:underline"
            to={register ? '/login' : '/register'}
          >
            {register ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </div>
  );
}
export function LoginPage() {
  return <AuthForm register={false} />;
}
export function RegisterPage() {
  return <AuthForm register />;
}

export function DashboardPage() {
  const {
    data: user,
    isPending,
    error,
  } = useQuery({ queryKey: ['me'], queryFn: authAPI.me, retry: false });
  const { data: progress } = useQuery({
    queryKey: ['progress'],
    queryFn: authAPI.progress,
    retry: false,
    enabled: Boolean(user),
  });
  const client = useQueryClient();
  const logout = useMutation({
    mutationFn: authAPI.logout,
    onSuccess: () => client.removeQueries({ queryKey: ['me'] }),
  });
  if (isPending) return <p>Loading your learning profile…</p>;
  if (error || !user) return <Navigate to="/login" replace />;
  return (
    <div>
      <section className="rounded-3xl bg-ink p-7 text-white shadow-sm sm:p-9">
        <p className="font-bold tracking-wide text-sun">YOUR LEARNING SPACE</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Hello, {user.displayName}</h1>
            <p className="mt-2 max-w-xl text-slate-300">
              Small, focused sessions build confident road judgement. Choose
              your next step below.
            </p>
          </div>
          <Link
            to="/exams"
            className="rounded-xl bg-sun px-4 py-3 font-bold text-ink"
          >
            Practice exam →
          </Link>
        </div>
        {progress && (
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <Trophy className="text-sun" size={20} />
              <strong className="mt-2 block text-2xl">
                {progress.totalXp} XP
              </strong>
              <span className="text-sm text-slate-300">
                Level {progress.level.number}
              </span>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <Flame className="text-sun" size={20} />
              <strong className="mt-2 block text-2xl">
                {progress.currentStreak} days
              </strong>
              <span className="text-sm text-slate-300">Current streak</span>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <GraduationCap className="text-sun" size={20} />
              <strong className="mt-2 block text-2xl">
                {progress.completedQuizzes}
              </strong>
              <span className="text-sm text-slate-300">Quizzes completed</span>
            </div>
          </div>
        )}
      </section>
      {progress ? (
        <>
          <section className="mt-7">
            <div className="flex items-end justify-between">
              <div>
                <p className="font-bold text-ocean">NEXT ACTION</p>
                <h2 className="mt-1 text-2xl font-bold">Keep your momentum</h2>
              </div>
              <span className="text-sm text-slate-500">
                Your progress is saved automatically
              </span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <PrimaryLink to="/">
                {' '}
                <BookOpen size={18} />
                Continue learning
              </PrimaryLink>
              <Link
                to="/scenarios"
                className="rounded-xl border border-slate-200 bg-white p-4 font-bold text-ink shadow-sm hover:border-ocean"
              >
                <CarFront className="mb-3 text-ocean" />
                Play a driving scenario
              </Link>
              <Link
                to="/exams"
                className="rounded-xl border border-slate-200 bg-white p-4 font-bold text-ink shadow-sm hover:border-ocean"
              >
                <GraduationCap className="mb-3 text-ocean" />
                Take a timed exam
              </Link>
            </div>
          </section>
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="admin-card">
              <LearningPath />
            </div>
            <aside className="admin-card">
              <h2 className="text-xl font-bold">Your activity</h2>
              <div className="mt-5 space-y-4">
                <p className="flex justify-between">
                  <span className="text-slate-600">Lessons completed</span>
                  <strong>{progress.completedLessons}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-600">Scenarios completed</span>
                  <strong>{progress.completedScenarios}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-600">Longest streak</span>
                  <strong>{progress.longestStreak} days</strong>
                </p>
              </div>
            </aside>
          </section>
        </>
      ) : (
        <p className="mt-6 text-slate-600">Loading progress…</p>
      )}
      <button
        onClick={() => logout.mutate()}
        className="mt-8 text-sm font-semibold text-slate-500 hover:text-ocean"
      >
        Log out
      </button>
    </div>
  );
}
