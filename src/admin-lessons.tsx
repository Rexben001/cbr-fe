import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { adminAPI, AdminLesson } from './api/admin';
import { authAPI } from './api/auth';
import { AdminLayout, AdminListControls, NewItemButton, StatusBadge } from './admin-ui';
import { ErrorState, Loading } from './components';
import { LessonBuilder } from './lesson-builder';
import { AdminMediaPicker } from './media';
import { RichTextEditor } from './rich-text';
import { AdminFullscreenPreview } from './admin-preview';

const blank = (): AdminLesson => ({
  id: '',
  topicId: '',
  slug: '',
  title: '',
  content: '',
  document: { version: 1, blocks: [] },
  displayOrder: 0,
  prerequisiteIds: [],
  status: 'draft',
  version: 0,
  sourceReference: '',
  flaggedForReview: false,
});

export function AdminLessonsPage() {
  const pageSize = 25;
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const me = useQuery({ queryKey: ['me'], queryFn: authAPI.me, retry: false });
  const lessons = useQuery({
    queryKey: ['admin-lessons', search, status, offset],
    queryFn: () => adminAPI.listLessons({ limit: pageSize, offset, status: status as import('./api/admin').ContentStatus | '', search }),
    enabled: me.data?.role === 'admin',
  });
  const topics = useQuery({
    queryKey: ['admin-topics'],
    queryFn: adminAPI.topics,
    enabled: me.data?.role === 'admin',
  });
  const client = useQueryClient();
  const [item, setItem] = useState(blank());
  const save = useMutation({
    mutationFn: () =>
      item.version ? adminAPI.updateLesson(item) : adminAPI.createLesson(item),
    onSuccess: (saved) => {
      client.invalidateQueries({ queryKey: ['admin-lessons'] });
      setItem(saved);
      setDirty(false);
    },
  });
  const transition = useMutation({
    mutationFn: (action: 'submit-review' | 'publish' | 'archive') =>
      adminAPI.transition('lessons', item.id, action, item.version),
    onSuccess: (_data, action) => {
      client.invalidateQueries({ queryKey: ['admin-lessons'] });
      setItem((value) => ({
        ...value,
        status:
          action === 'submit-review'
            ? 'in_review'
            : action === 'publish'
              ? 'published'
              : 'archived',
        version: value.version + 1,
      }));
    },
  });
  const error =
    transition.error instanceof Error
      ? transition.error.message
      : save.error instanceof Error
        ? save.error.message
        : '';
  if (me.isPending || lessons.isPending || topics.isPending) return <Loading />;
  if (!me.data || me.data.role !== 'admin')
    return <Navigate to="/dashboard" replace />;
  if (!lessons.data || !topics.data)
    return <ErrorState message="Lessons could not be loaded." />;
  const nextDisplayOrder = (topicId: string) =>
    Math.max(
      -1,
      ...lessons.data.lessons
        .filter((lesson) => lesson.topicId === topicId)
        .map((lesson) => lesson.displayOrder),
    ) + 1;
  return (
    <AdminLayout
      title="Lessons"
      description="Write lesson content and attach images, GIFs or videos."
      action={
        <NewItemButton label="New lesson" onClick={() => { setItem(blank()); setDirty(false); setEditorOpen(true); }} />
      }
    >
      <div className={`mt-6 ${editorOpen ? '' : 'grid gap-6'}`}>
        {!editorOpen && (
        <section className="admin-card max-h-[70vh] overflow-y-auto p-2">
          <AdminListControls search={search} onSearch={(value) => { setSearch(value); setOffset(0); }} status={status} onStatus={(value) => { setStatus(value); setOffset(0); }} count={lessons.data.lessons.length} offset={offset} pageSize={pageSize} onPrevious={() => setOffset((value) => Math.max(0, value - pageSize))} onNext={() => setOffset((value) => value + pageSize)} />
          {lessons.data.lessons.map((lesson) => (
            <button
              key={lesson.id}
              type="button"
              onClick={() => { setItem(lesson); setDirty(false); setEditorOpen(true); }}
              className={`mb-1 block w-full rounded-xl p-3 text-left ${item.id === lesson.id ? 'bg-sky ring-1 ring-ocean' : 'hover:bg-slate-50'}`}
            >
              <div className="flex gap-2">
                <strong className="flex-1">{lesson.title}</strong>
                <StatusBadge status={lesson.status} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {lesson.topicId} · v{lesson.version}
              </p>
            </button>
          ))}
        </section>
        )}
        {editorOpen && (
        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            save.mutate();
          }}
          onChangeCapture={() => setDirty(true)}
          className="admin-card space-y-5"
        >
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-bold">
                {item.version ? 'Edit lesson' : 'Create lesson'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Build the lesson visually from reusable content blocks.
              </p>
            </div>
            {item.version > 0 && <StatusBadge status={item.status} />}
            <button type="button" className="admin-secondary-button" onClick={() => { if (!dirty || window.confirm('Discard unsaved lesson changes?')) setEditorOpen(false); }}>Back to lessons</button>
            <button type="button" className="admin-secondary-button" onClick={() => setPreviewOpen(true)}>Preview</button>
            {item.version > 0 && <button type="button" className="admin-secondary-button" onClick={() => setPracticeOpen(true)}>Manage practice questions</button>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="admin-label">
              Lesson ID
              <input
                required
                disabled={!!item.version}
                value={item.id}
                onChange={(e) => setItem({ ...item, id: e.target.value })}
                className="admin-field"
              />
            </label>
            <label className="admin-label">
              Topic
              <select
                required
                value={item.topicId}
                onChange={(e) => {
                  const topicId = e.target.value;
                  setItem({
                    ...item,
                    topicId,
                    displayOrder: item.version
                      ? item.displayOrder
                      : nextDisplayOrder(topicId),
                  });
                }}
                className="admin-field"
              >
                <option value="">Choose topic…</option>
                {topics.data.topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.titleNl}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-label">
              Slug
              <input
                required
                value={item.slug}
                onChange={(e) => setItem({ ...item, slug: e.target.value })}
                className="admin-field"
              />
              {!item.version && item.topicId && (
                <span className="mt-1 block text-xs text-slate-500">
                  Suggested next position for this topic. You can change it.
                </span>
              )}
            </label>
            <label className="admin-label">
              Title
              <input
                required
                value={item.title}
                onChange={(e) => setItem({ ...item, title: e.target.value })}
                className="admin-field"
              />
            </label>
            <div className="md:col-span-2">
              <label className="admin-label mb-1">Fallback content</label>
              <RichTextEditor
                label="Lesson fallback content"
                value={item.content}
                lessonId={item.version ? item.id : undefined}
                onChange={(content) => setItem({ ...item, content })}
              />
              <span className="mt-1 block text-xs text-slate-500">
                Shown only when the lesson has no structured blocks.
              </span>
            </div>
            <label className="admin-label">
              Display order
              <input
                type="number"
                min="0"
                value={item.displayOrder}
                onChange={(e) =>
                  setItem({ ...item, displayOrder: Number(e.target.value) })
                }
                className="admin-field"
              />
            </label>
            <label className="admin-label">
              Source / legal reference
              <input
                value={item.sourceReference}
                onChange={(e) =>
                  setItem({ ...item, sourceReference: e.target.value })
                }
                className="admin-field"
              />
            </label>
          </div>
          <LessonBuilder
            document={item.document ?? { version: 1, blocks: [] }}
            onChange={(document) => setItem({ ...item, document })}
          />
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm text-slate-600">
              {item.status === 'draft'
                ? 'Save your changes, then send this draft for review.'
                : item.status === 'in_review'
                  ? 'This lesson is ready for final review and publishing.'
                  : item.status === 'published'
                    ? 'This lesson is visible to learners. Save changes before starting another review cycle.'
                    : 'This lesson is archived and hidden from learners.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="admin-primary-button"
                disabled={save.isPending}
              >
                {save.isPending
                  ? 'Saving…'
                  : item.version
                    ? 'Save changes'
                    : 'Create draft'}
              </button>
              {item.version > 0 && (
                <>
                  {item.status === 'draft' && (
                    <button
                      type="button"
                      disabled={transition.isPending}
                      onClick={() => transition.mutate('submit-review')}
                      className="admin-secondary-button"
                    >
                      Send to review
                    </button>
                  )}
                  {item.status === 'in_review' && (
                    <button
                      type="button"
                      disabled={transition.isPending}
                      onClick={() => transition.mutate('publish')}
                      className="admin-secondary-button"
                    >
                      Publish lesson
                    </button>
                  )}
                  {item.status !== 'archived' && (
                    <button
                      type="button"
                      disabled={transition.isPending}
                      onClick={() => transition.mutate('archive')}
                      className="admin-secondary-button"
                    >
                      Archive
                    </button>
                  )}
                  <Link
                    to={`/admin/lessons/${item.id}/revisions`}
                    className="admin-secondary-button"
                  >
                    Revision history
                  </Link>
                </>
              )}
            </div>
          </div>
          {error && <ErrorState message={error} />}
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer font-bold">
              Additional lesson media
            </summary>
            <p className="mt-2 text-sm text-slate-600">
              Use this for supporting media that is not placed inside a lesson
              block.
            </p>
            <AdminMediaPicker
              type="lesson"
              contentId={item.version ? item.id : ''}
            />
          </details>
        </form>
        )}
      </div>
      {previewOpen && <AdminFullscreenPreview title={item.title || 'Untitled lesson'} content={item.content} onClose={() => setPreviewOpen(false)} />}
      {practiceOpen && <LessonPracticeQuestionDialog lessonID={item.id} onClose={() => setPracticeOpen(false)} />}
    </AdminLayout>
  );
}

function LessonPracticeQuestionDialog({ lessonID, onClose }: { lessonID: string; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('');
  const links = useQuery({ queryKey: ['lesson-practice-links', lessonID], queryFn: () => adminAPI.lessonPracticeQuestions(lessonID) });
  const bank = useQuery({ queryKey: ['lesson-practice-bank'], queryFn: () => adminAPI.listQuestions({ limit: 100 }) });
  const client = useQueryClient();
  const [selected, setSelected] = useState<string[] | null>(null);
  const ids = selected ?? links.data ?? [];
  const save = useMutation({ mutationFn: () => adminAPI.setLessonPracticeQuestions(lessonID, ids), onSuccess: () => { client.invalidateQueries({ queryKey: ['lesson-practice-links', lessonID] }); onClose(); } });
  const questions = (bank.data?.questions ?? []).filter((question) => (!topic || question.topicId === topic) && (!search || question.text.toLowerCase().includes(search.toLowerCase())));
  const topics = [...new Set((bank.data?.questions ?? []).map((question) => question.topicId))];
  const move = (id: string, direction: -1 | 1) => setSelected((current) => { const values = [...(current ?? links.data ?? [])]; const index = values.indexOf(id); const target = index + direction; if (target < 0 || target >= values.length) return values; [values[index], values[target]] = [values[target], values[index]]; return values; });
  return <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="lesson-practice-manager"><div className="mx-auto my-8 max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"><h2 id="lesson-practice-manager" className="text-xl font-bold">Manage lesson practice questions</h2><p className="mt-1 text-sm text-slate-600">Only published questions linked here appear at the end of this lesson. Use the arrows to set learner order.</p><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_12rem]"><input className="admin-field mt-0" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search question text" /><select className="admin-field mt-0" value={topic} onChange={(event) => setTopic(event.target.value)}><option value="">All topics</option>{topics.map((value) => <option value={value} key={value}>{value}</option>)}</select></div><div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">{questions.map((question) => { const position = ids.indexOf(question.id); const checked = position >= 0; return <div key={question.id} className="flex gap-3 rounded-xl border p-3 hover:bg-slate-50"><input aria-label={`Include ${question.id}`} type="checkbox" checked={checked} onChange={() => setSelected((current) => { const values = current ?? links.data ?? []; return checked ? values.filter((id) => id !== question.id) : [...values, question.id]; })} /><span className="flex-1"><span className="text-xs text-slate-500">{question.topicId} · {question.status}</span><strong className="mt-1 block">{question.text.replace(/[#*_]/g, '')}</strong></span>{checked && <span className="flex items-center gap-1"><small>{position + 1}</small><button type="button" className="admin-secondary-button px-2" disabled={position === 0} onClick={() => move(question.id, -1)}>↑</button><button type="button" className="admin-secondary-button px-2" disabled={position === ids.length - 1} onClick={() => move(question.id, 1)}>↓</button></span>}</div>})}</div><p className="mt-3 text-sm text-slate-600">{ids.length} selected.</p><div className="mt-5 flex justify-end gap-3"><button type="button" className="admin-secondary-button" onClick={onClose}>Cancel</button><button type="button" className="admin-primary-button" disabled={save.isPending} onClick={() => save.mutate()}>Save practice questions</button></div>{(links.error || bank.error || save.error) && <ErrorState message="Practice-question links could not be saved." />}</div></div>;
}
