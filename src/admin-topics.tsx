import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { adminAPI, AdminTopic } from './api/admin';
import { authAPI } from './api/auth';
import { AdminLayout, AdminListControls, NewItemButton, StatusBadge, useDebouncedValue } from './admin-ui';
import { ErrorState, Loading } from './components';
import { AdminFullscreenPreview } from './admin-preview';

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
  const pageSize = 25;
  const [search, setSearch] = useState('');
  const committedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const me = useQuery({ queryKey: ['me'], queryFn: authAPI.me, retry: false });
  const q = useQuery({
    queryKey: ['admin-topics', committedSearch, status, offset],
    queryFn: () => adminAPI.listTopics({ limit: pageSize, offset, status: status as import('./api/admin').ContentStatus | '', search: committedSearch }),
    placeholderData: (previous) => previous,
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
        <NewItemButton label="New topic" onClick={() => { setForm(blank()); setEditorOpen(true); }} />
      }
    >
      <div className={`mt-6 ${editorOpen ? '' : 'grid gap-6'}`}>
        {!editorOpen && <section className="admin-card max-h-[70vh] overflow-y-auto p-2">
          <AdminListControls search={search} onSearch={(value) => { setSearch(value); setOffset(0); }} status={status} onStatus={(value) => { setStatus(value); setOffset(0); }} count={q.data.topics.length} offset={offset} pageSize={pageSize} onPrevious={() => setOffset((value) => Math.max(0, value - pageSize))} onNext={() => setOffset((value) => value + pageSize)} />
          {q.data.topics.map((t) => (
            <button
              key={t.id}
              onClick={() => { setForm(t); setEditorOpen(true); }}
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
        </section>}
        {editorOpen && <form onSubmit={submit} className="admin-card">
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
            <button type="button" className="admin-secondary-button" onClick={() => setEditorOpen(false)}>Back to topics</button>
            <button type="button" className="admin-secondary-button" onClick={() => setPreviewOpen(true)}>Preview</button>
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
        </form>}
      </div>
      {previewOpen && <AdminFullscreenPreview title={form.titleNl || 'Untitled topic'} content={form.descriptionNl} onClose={() => setPreviewOpen(false)} />}
    </AdminLayout>
  );
}
