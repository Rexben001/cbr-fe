import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { adminAPI, AdminTopic } from './api/admin';
import { authAPI } from './api/auth';
import { AdminLayout, NewItemButton, StatusBadge } from './admin-ui';
import { ErrorState, Loading } from './components';

const blank = (): AdminTopic => ({
  id: '',
  slug: '',
  titleNl: '',
  titleEn: '',
  descriptionNl: '',
  descriptionEn: '',
  displayOrder: 0,
  status: 'draft',
  version: 0,
  sourceReference: '',
  flaggedForReview: false,
});
const label: Record<string, string> = {
  id: 'Topic ID',
  slug: 'URL slug',
  titleNl: 'Dutch title',
  titleEn: 'English title',
  descriptionNl: 'Dutch description',
  descriptionEn: 'English description',
  sourceReference: 'Source / legal reference',
};

export function AdminTopicsPage() {
  const me = useQuery({ queryKey: ['me'], queryFn: authAPI.me, retry: false });
  const q = useQuery({
    queryKey: ['admin-topics'],
    queryFn: adminAPI.topics,
    enabled: me.data?.role === 'admin',
  });
  const client = useQueryClient();
  const refresh = () =>
    client.invalidateQueries({ queryKey: ['admin-topics'] });
  const [form, setForm] = useState(blank());
  const save = useMutation({
    mutationFn: () =>
      form.version ? adminAPI.updateTopic(form) : adminAPI.createTopic(form),
    onSuccess: () => {
      refresh();
      setForm(blank());
    },
  });
  const transition = useMutation({
    mutationFn: (action: 'submit-review' | 'publish' | 'archive') =>
      adminAPI.transitionTopic(form.id, action, form.version),
    onSuccess: () => {
      refresh();
      setForm((v) => ({ ...v, version: v.version + 1 }));
    },
  });
  if (me.isPending || q.isPending) return <Loading />;
  if (!me.data || me.data.role !== 'admin')
    return <Navigate to="/dashboard" replace />;
  if (!q.data) return <ErrorState message="Topics could not be loaded." />;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };
  return (
    <AdminLayout
      title="Topics"
      description="Topics organise lessons, questions and scenarios. Start here when adding a new subject."
      action={
        <NewItemButton label="New topic" onClick={() => setForm(blank())} />
      }
    >
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(18rem,.75fr)_minmax(0,1.25fr)]">
        <section className="admin-card max-h-[70vh] overflow-y-auto p-2">
          <p className="px-3 pb-2 pt-1 text-sm font-semibold text-slate-500">
            {q.data.topics.length} topics
          </p>
          {q.data.topics.map((t) => (
            <button
              key={t.id}
              onClick={() => setForm(t)}
              className={`mb-1 block w-full rounded-xl p-3 text-left transition hover:bg-slate-50 ${form.id === t.id ? 'bg-sky ring-1 ring-ocean' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <strong>{t.titleNl}</strong>
                <StatusBadge status={t.status} />
              </div>
              <p className="mt-1 truncate text-sm text-slate-500">
                /{t.slug} · Version {t.version}
              </p>
            </button>
          ))}
        </section>
        <form onSubmit={submit} className="admin-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold">
                {form.version ? `Editing: ${form.titleNl}` : 'Create a topic'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {form.version
                  ? 'Save changes before moving this topic through the publishing workflow.'
                  : 'New topics start as drafts and remain hidden from learners.'}
              </p>
            </div>
            {form.version > 0 && <StatusBadge status={form.status} />}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {(
              [
                'id',
                'slug',
                'titleNl',
                'titleEn',
                'descriptionNl',
                'descriptionEn',
                'sourceReference',
              ] as const
            ).map((k) => (
              <label
                key={k}
                className={`admin-label ${k.includes('description') || k === 'sourceReference' ? 'md:col-span-2' : ''}`}
              >
                {label[k]}
                {k.includes('description') ? (
                  <textarea
                    required={k === 'descriptionNl'}
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    className="admin-field min-h-24"
                  />
                ) : (
                  <input
                    required={['id', 'slug', 'titleNl'].includes(k)}
                    disabled={k === 'id' && Boolean(form.version)}
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    className="admin-field"
                  />
                )}
              </label>
            ))}
            <label className="admin-label">
              Display order
              <input
                type="number"
                value={form.displayOrder}
                onChange={(e) =>
                  setForm({ ...form, displayOrder: Number(e.target.value) })
                }
                className="admin-field"
              />
            </label>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button disabled={save.isPending} className="admin-primary-button">
              {save.isPending
                ? 'Saving…'
                : form.version
                  ? 'Save changes'
                  : 'Create draft'}
            </button>
            {form.version > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => transition.mutate('submit-review')}
                  className="admin-secondary-button"
                >
                  Send to review
                </button>
                <button
                  type="button"
                  onClick={() => transition.mutate('publish')}
                  className="admin-secondary-button"
                >
                  Publish
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Archive this topic? Learners will no longer see it.',
                      )
                    )
                      transition.mutate('archive');
                  }}
                  className="admin-secondary-button"
                >
                  Archive
                </button>
                <Link
                  to={`/admin/topics/${form.id}/revisions`}
                  className="admin-secondary-button"
                >
                  Revision history
                </Link>
              </>
            )}
          </div>
          {(save.error || transition.error) && (
            <div className="mt-4">
              <ErrorState message="This change could not be saved. Refresh and try again." />
            </div>
          )}
        </form>
      </div>
    </AdminLayout>
  );
}
