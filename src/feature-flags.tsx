import { Flag } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { type FeatureKey } from './api/features';
import { ErrorState, Loading } from './components';
import { useFeatureFlags } from './use-feature-flags';

export function FeatureRoute({
  feature,
  children,
}: PropsWithChildren<{ feature: FeatureKey }>) {
  const flags = useFeatureFlags();
  if (flags.isPending) return <Loading />;
  if (flags.isError)
    return <ErrorState message="Feature availability could not be loaded. Please try again." />;
  if (flags.data[feature] !== false) return <>{children}</>;
  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
        <Flag aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-2xl font-bold">Feature temporarily unavailable</h1>
      <p className="mt-2 text-slate-600">
        This part of RijFiks has been disabled by an administrator.
      </p>
      <Link className="admin-primary-button mt-6" to="/">
        Return to RijFiks
      </Link>
    </section>
  );
}

