import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { adminAPI, AdminLesson } from './api/admin';
import { authAPI } from './api/auth';
import { AdminLayout, NewItemButton, StatusBadge } from './admin-ui';
import { ErrorState, Loading } from './components';
import { LessonBuilder } from './lesson-builder';
import { AdminMediaPicker } from './media';
import { RichTextEditor } from './rich-text';

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
  const me = useQuery({ queryKey: ['me'], queryFn: authAPI.me, retry: false });
  const lessons = useQuery({
    queryKey: ['admin-lessons'],
    queryFn: adminAPI.lessons,
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
        <NewItemButton label="New lesson" onClick={() => setItem(blank())} />
      }
    >
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(18rem,.75fr)_minmax(0,1.25fr)]">
        <section className="admin-card max-h-[70vh] overflow-y-auto p-2">
          {lessons.data.lessons.map((lesson) => (
            <button
              key={lesson.id}
              type="button"
              onClick={() => setItem(lesson)}
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
        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            save.mutate();
          }}
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
      </div>
    </AdminLayout>
  );
}
