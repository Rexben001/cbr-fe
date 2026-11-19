import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag, ShieldCheck } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { adminAPI, type FeatureFlag } from './api/admin';
import { authAPI } from './api/auth';
import { AdminLayout } from './admin-ui';
import { ErrorState, Loading } from './components';

const groups: Array<{ title: string; keys: string[] }> = [
  { title: 'Learning', keys: ['learning_roadmap', 'topic_checkpoints', 'embedded_lesson_quizzes'] },
  { title: 'Practice and assessment', keys: ['practice_hub', 'mock_exams', 'scenarios'] },
  { title: 'Reference tools', keys: ['traffic_signs', 'dashboard_symbols', 'global_search', 'saved_items', 'driving_school_finder'] },
  { title: 'Account', keys: ['learner_dashboard', 'account_settings'] },
];

export function AdminFeatureFlagsPage() {
  const client = useQueryClient();
  const user = useQuery({ queryKey: ['me'], queryFn: authAPI.me, retry: false });
  const flags = useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: adminAPI.featureFlags,
    enabled: user.data?.role === 'admin',
    retry: false,
  });
  const update = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      adminAPI.updateFeatureFlag(key, enabled),
    onSuccess: (changed) => {
      client.setQueryData<FeatureFlag[]>(['admin-feature-flags'], (current = []) =>
        current.map((flag) => flag.key === changed.key ? changed : flag),
      );
      client.invalidateQueries({ queryKey: ['feature-flags'] });
    },
  });
  if (user.isPending || flags.isPending) return <Loading />;
  if (!user.data || user.data.role !== 'admin') return <Navigate to="/dashboard" replace />;

  const values = flags.data ?? [];
  return (
    <AdminLayout
      title="Feature flags"
      description="Enable or disable learner-facing modules without redeploying RijFiks. Admin and authentication access remain available."
    >
      <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
        <ShieldCheck className="mr-2 inline" size={18} />
        Changes apply to navigation, learner routes and protected backend endpoints.
      </div>
      {(flags.error || update.error) && (
        <div className="mt-5"><ErrorState message="Feature flags could not be updated." /></div>
      )}
      <div className="mt-6 space-y-6">
        {groups.map((group) => {
          const groupFlags = group.keys.map((key) => values.find((flag) => flag.key === key)).filter((flag): flag is FeatureFlag => Boolean(flag));
          if (!groupFlags.length) return null;
          return (
            <section className="admin-card" key={group.title}>
              <h2 className="flex items-center gap-2 text-lg font-bold"><Flag size={18} className="text-ocean" />{group.title}</h2>
              <div className="mt-4 divide-y divide-slate-100">
                {groupFlags.map((flag) => (
                  <div className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0" key={flag.key}>
                    <div>
                      <h3 className="font-bold text-ink">{flag.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">{flag.description}</p>
                      <code className="mt-1 block text-xs text-slate-400">{flag.key}</code>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={flag.enabled}
                      aria-label={`${flag.enabled ? 'Disable' : 'Enable'} ${flag.name}`}
                      disabled={update.isPending}
                      onClick={() => update.mutate({ key: flag.key, enabled: !flag.enabled })}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-ocean focus:ring-offset-2 disabled:opacity-50 ${flag.enabled ? 'bg-ocean' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${flag.enabled ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </AdminLayout>
  );
}

