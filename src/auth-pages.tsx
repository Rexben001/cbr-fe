import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from './api/auth';
import { APIError } from './api/client';
import { LearnerDashboard } from './learner-dashboard';
import { useFeatureFlags } from './use-feature-flags';

function AuthForm({ register }: { register: boolean }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const flags = useFeatureFlags();
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
      if (user.role === 'admin') {
        navigate('/admin');
        return;
      }
      const destination =
        flags.data?.learner_dashboard !== false
          ? '/dashboard'
          : flags.data?.learning_roadmap !== false
            ? '/'
            : flags.data?.practice_hub !== false
              ? '/practice'
              : '/settings';
      navigate(destination);
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
        {!register&&<Link className="mt-3 block text-sm font-bold text-ocean hover:underline" to="/forgot-password">Forgot password?</Link>}
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
export function ForgotPasswordPage(){const[email,setEmail]=useState('');const mutation=useMutation({mutationFn:()=>authAPI.requestPasswordReset(email)});return <AccountCard title="Reset password"><form className="space-y-4" onSubmit={e=>{e.preventDefault();mutation.mutate()}}><p className="text-slate-600">Enter account email. Reset instructions expire after one hour.</p><label className="admin-label">Email<input className="admin-field" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="admin-primary-button" disabled={mutation.isPending}>Request reset</button>{mutation.data&&<div role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{mutation.data.message}{mutation.data.resetToken&&<Link className="mt-2 block font-bold underline" to={`/reset-password?token=${encodeURIComponent(mutation.data.resetToken)}`}>Continue with development reset token</Link>}</div>}</form></AccountCard>}
export function ResetPasswordPage(){const[params]=useSearchParams();const[token,setToken]=useState(params.get('token')??'');const[password,setPassword]=useState('');const[confirm,setConfirm]=useState('');const mutation=useMutation({mutationFn:()=>authAPI.resetPassword(token,password)});return <AccountCard title="Choose new password">{mutation.isSuccess?<p role="status" className="rounded-xl bg-emerald-50 p-4">Password changed. <Link className="font-bold underline" to="/login">Log in</Link>.</p>:<form className="space-y-4" onSubmit={e=>{e.preventDefault();if(password===confirm)mutation.mutate()}}><label className="admin-label">Reset token<input className="admin-field" required value={token} onChange={e=>setToken(e.target.value)}/></label><label className="admin-label">New password<input className="admin-field" type="password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/></label><label className="admin-label">Confirm password<input className="admin-field" type="password" minLength={12} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>{confirm&&password!==confirm&&<p role="alert" className="text-red-700">Passwords do not match.</p>}{mutation.error&&<p role="alert" className="text-red-700">Reset token is invalid or expired.</p>}<button className="admin-primary-button" disabled={password!==confirm||mutation.isPending}>Reset password</button></form>}</AccountCard>}
function AccountCard({title,children}:{title:string;children:ReactNode}){return <div className="mx-auto max-w-lg rounded-3xl bg-white p-7 shadow-lg sm:p-10"><p className="font-bold text-ocean">ACCOUNT SECURITY</p><h1 className="mb-6 mt-2 text-3xl font-bold">{title}</h1>{children}</div>}

export function DashboardPage() {
  return <LearnerDashboard />;
}
