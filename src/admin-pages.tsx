import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { adminAPI } from './api/admin';
import { authAPI } from './api/auth';
import { AdminLayout } from './admin-ui';
import { ErrorState, Loading } from './components';

export function AdminDashboardPage() {
  const user = useQuery({
    queryKey: ['me'],
    queryFn: authAPI.me,
    retry: false,
  });
  const data = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminAPI.dashboard,
    enabled: user.data?.role === 'admin',
    retry: false,
  });
  if (user.isPending || data.isPending) return <Loading />;
  if (!user.data || user.data.role !== 'admin')
    return <Navigate to="/dashboard" replace />;
  if (!data.data)
    return <ErrorState message="Admin metrics could not be loaded." />;
  const d = data.data;
  const content = [
    ['Topics', d.topics],
    ['Lessons', d.lessons],
    ['Questions', d.questions],
    ['Scenarios', d.scenarios],
  ];
  const workflow = [
    ['Drafts', d.draft, 'bg-slate-100 text-slate-700'],
    ['In review', d.inReview, 'bg-amber-100 text-amber-800'],
    ['Published', d.published, 'bg-emerald-100 text-emerald-800'],
    ['Needs review', d.flagged, 'bg-red-100 text-red-800'],
  ];
  return (
    <AdminLayout
      title="Content overview"
      description="Create, review and publish every learner-facing part of RijFiks."
    >
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {content.map(([name, value]) => (
          <div key={String(name)} className="admin-card">
            <p className="text-sm font-semibold text-slate-500">{name}</p>
            <strong className="mt-2 block text-4xl text-ink">{value}</strong>
            <p className="mt-2 text-sm text-slate-500">Total items</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="admin-card">
          <h2 className="text-lg font-bold">Publishing queue</h2>
          <p className="mt-1 text-sm text-slate-600">
            Use these counts to decide what needs attention next.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {workflow.map(([name, value, classes]) => (
              <div key={String(name)} className={`rounded-xl p-4 ${classes}`}>
                <strong className="block text-2xl">{value}</strong>
                <span className="text-sm font-semibold">{name}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl bg-ink p-6 text-white">
          <p className="text-sm font-semibold text-slate-300">
            LEARNER ACTIVITY
          </p>
          <strong className="mt-3 block text-4xl">{d.learners}</strong>
          <p className="text-slate-300">registered learners</p>
          <div className="mt-6 border-t border-slate-600 pt-4">
            <p>
              <strong>{d.completedExams}</strong> completed exams
            </p>
            <p className="mt-2">
              <strong>{d.examPassRate}%</strong> exam pass rate
            </p>
          </div>
        </section>
      </div>
      <section className="admin-card mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Create content</h2>
            <p className="mt-1 text-sm text-slate-600">Start with the content type you need. New items remain drafts until they are published.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="admin-secondary-button" to="/admin/topics">New topic</Link>
            <Link className="admin-secondary-button" to="/admin/lessons">New lesson</Link>
            <Link className="admin-secondary-button" to="/admin/questions">New question</Link>
            <Link className="admin-secondary-button" to="/admin/scenarios">New scenario</Link>
          </div>
        </div>
      </section>
    </AdminLayout>
  );
}
