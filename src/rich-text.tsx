import Link from '@tiptap/extension-link';
import { Node } from '@tiptap/core';
import {
  EditorContent,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  CircleHelp,
  Film,
  GripVertical,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Plus,
  Quote,
  Redo2,
  RemoveFormatting,
  Search,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { htmlToMarkdown, markdownToHTML } from './rich-text-format';
import { adminAPI, type AdminLessonQuiz, type AdminQuestion } from './api/admin';
import { learningAPI } from './api/learning';
import { MediaPreview } from './media';
import { EmbeddedLessonQuiz } from './lesson-quiz';
import { LessonQuizRevisions } from './lesson-quiz-revisions';

const LessonQuizNode = Node.create({
  name: 'lessonQuiz',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { quizId: { default: '' } };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-rich-lesson-quiz-id]',
        getAttrs: (element) => ({
          quizId: (element as HTMLElement).dataset.richLessonQuizId ?? '',
        }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-rich-lesson-quiz-id': HTMLAttributes.quizId }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(({ node, deleteNode }: NodeViewProps) => (
      <NodeViewWrapper className="my-4 rounded-xl border-2 border-ocean/30 bg-sky p-4">
        <div contentEditable={false} className="flex items-center gap-3">
          <CircleHelp className="text-ocean" />
          <div className="flex-1">
            <strong>Embedded lesson quiz</strong>
            <p className="text-sm text-slate-600">{node.attrs.quizId}</p>
          </div>
          <button
            type="button"
            className="admin-secondary-button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent('rijfiks:edit-lesson-quiz', {
                  detail: String(node.attrs.quizId),
                }),
              )
            }
          >
            Edit quiz
          </button>
          <button
            type="button"
            className="admin-secondary-button text-red-700"
            onClick={deleteNode}
          >
            Remove quiz
          </button>
        </div>
      </NodeViewWrapper>
    ));
  },
});

const newID = (prefix: string) =>
  `${prefix}-${crypto.randomUUID().replaceAll('-', '').slice(0, 18)}`;
const newQuestion = () => ({
  id: newID('lesson-quiz-question'),
  text: '',
  type: 'single_select' as const,
  explanation: '',
  options: [
    { id: newID('lesson-quiz-option'), text: '', correct: true },
    { id: newID('lesson-quiz-option'), text: '', correct: false },
  ],
});

function LessonQuizDialog({
  quiz,
  isNew,
  onClose,
  onSaved,
}: {
  quiz: AdminLessonQuiz;
  isNew: boolean;
  onClose: () => void;
  onSaved: (quiz: AdminLessonQuiz) => void;
}) {
  const [draft, setDraft] = useState(quiz);
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importedQuestionIDs, setImportedQuestionIDs] = useState<Set<string>>(
    new Set(),
  );
  const media = useQuery({
    queryKey: ['lesson-quiz-media', search],
    queryFn: () => adminAPI.media({ search, status: 'available' }),
  });
  const save = useMutation({
    mutationFn: () => adminAPI.saveLessonQuiz(draft),
    onSuccess: onSaved,
  });
  const valid =
    Boolean(draft.title.trim()) &&
    draft.questions.length > 0 &&
    !draft.questions.some(
      (question) =>
        !question.text.trim() ||
        question.options.length < 2 ||
        question.options.some((option) => !option.text.trim()) ||
        !question.options.some((option) => option.correct) ||
        (question.type === 'single_select' &&
          question.options.filter((option) => option.correct).length !== 1),
    );
  const updateQuestion = (
    index: number,
    value: AdminLessonQuiz['questions'][number],
  ) =>
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, i) =>
        i === index ? value : question,
      ),
    }));
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-quiz-title"
    >
      <div className="mx-auto my-8 max-w-4xl rounded-2xl bg-white p-5 shadow-xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-bold text-ocean">EMBEDDED LESSON QUIZ</p>
            <h2 id="lesson-quiz-title" className="mt-1 text-2xl font-bold">
              Build a knowledge check
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Answers are scored by the backend and remain separate from
              practice and mock exams.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close quiz editor"
            className="wysiwyg-tool"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <label className="admin-label mt-6">
          Quiz title
          <input
            className="admin-field"
            value={draft.title}
            onChange={(event) =>
              setDraft({ ...draft, title: event.target.value })
            }
            placeholder="For example: Priority quick check"
          />
        </label>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ocean/20 bg-sky/40 p-4">
          <div>
            <h3 className="font-bold text-ink">Reuse question-bank content</h3>
            <p className="mt-1 text-sm text-slate-600">
              Imported questions are copied into this quiz, so later question-bank edits do not change this lesson.
            </p>
          </div>
          <button
            type="button"
            className="admin-secondary-button"
            onClick={() => setImportOpen(true)}
          >
            <Search size={16} /> Import questions
          </button>
        </div>
        <div className="mt-6 space-y-5">
          {draft.questions.map((question, index) => (
            <section
              key={question.id}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold">Question {index + 1}</h3>
                <button
                  type="button"
                  className="admin-secondary-button text-red-700"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      questions: current.questions.filter(
                        (_, i) => i !== index,
                      ),
                    }))
                  }
                  disabled={draft.questions.length === 1}
                >
                  Remove question
                </button>
              </div>
              <label className="admin-label mt-4">
                Question text
                <input
                  className="admin-field"
                  value={question.text}
                  onChange={(event) =>
                    updateQuestion(index, {
                      ...question,
                      text: event.target.value,
                    })
                  }
                />
              </label>
              <label className="admin-label mt-4">
                Answer type
                <select
                  className="admin-field"
                  value={question.type}
                  onChange={(event) => {
                    const type = event.target.value as
                      'single_select' | 'multi_select';
                    updateQuestion(index, {
                      ...question,
                      type,
                      options:
                        type === 'single_select'
                          ? question.options.map((option, optionIndex) => ({
                              ...option,
                              correct: optionIndex === 0,
                            }))
                          : question.options,
                    });
                  }}
                >
                  <option value="single_select">Single answer</option>
                  <option value="multi_select">Multiple answers</option>
                </select>
              </label>
              <div className="mt-4">
                <p className="admin-label">Answer options</p>
                <p className="mb-2 text-xs text-slate-500">
                  Mark the correct answer
                  {question.type === 'multi_select' ? 's' : ''}.
                </p>
                {question.options.map((option, optionIndex) => (
                  <div key={option.id} className="mb-2 flex gap-2">
                    <input
                      aria-label={`Correct option ${optionIndex + 1}`}
                      type={
                        question.type === 'single_select' ? 'radio' : 'checkbox'
                      }
                      name={question.id}
                      checked={option.correct}
                      onChange={() =>
                        updateQuestion(index, {
                          ...question,
                          options: question.options.map((value, i) => ({
                            ...value,
                            correct:
                              question.type === 'single_select'
                                ? i === optionIndex
                                : i === optionIndex
                                  ? !value.correct
                                  : value.correct,
                          })),
                        })
                      }
                    />
                    <input
                      className="admin-field mt-0 flex-1"
                      aria-label={`Option ${optionIndex + 1}`}
                      value={option.text}
                      onChange={(event) =>
                        updateQuestion(index, {
                          ...question,
                          options: question.options.map((value, i) =>
                            i === optionIndex
                              ? { ...value, text: event.target.value }
                              : value,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="wysiwyg-tool text-red-700"
                      aria-label={`Remove option ${optionIndex + 1}`}
                      onClick={() =>
                        updateQuestion(index, {
                          ...question,
                          options: question.options.filter(
                            (_, i) => i !== optionIndex,
                          ),
                        })
                      }
                      disabled={question.options.length <= 2}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="admin-secondary-button mt-2"
                  onClick={() =>
                    updateQuestion(index, {
                      ...question,
                      options: [
                        ...question.options,
                        {
                          id: newID('lesson-quiz-option'),
                          text: '',
                          correct: false,
                        },
                      ],
                    })
                  }
                >
                  <Plus size={16} /> Add option
                </button>
              </div>
              <label className="admin-label mt-4">
                Explanation and feedback
                <textarea
                  className="admin-field min-h-24"
                  value={question.explanation}
                  onChange={(event) =>
                    updateQuestion(index, {
                      ...question,
                      explanation: event.target.value,
                    })
                  }
                  placeholder="Explain the traffic rule after the learner answers."
                />
              </label>
              <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <label className="admin-label">
                  Optional question media
                  <select
                    className="admin-field"
                    value={question.mediaId ?? ''}
                    onChange={(event) =>
                      updateQuestion(index, {
                        ...question,
                        mediaId: event.target.value || undefined,
                      })
                    }
                  >
                    <option value="">No media</option>
                    {media.data?.media.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.kind} · {asset.altText || asset.originalFilename}
                      </option>
                    ))}
                  </select>
                </label>
                <input
                  className="admin-field mt-2"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search media library"
                />
              </div>
            </section>
          ))}
        </div>
        <button
          type="button"
          className="admin-secondary-button mt-5"
          onClick={() =>
            setDraft((current) => ({
              ...current,
              questions: [...current.questions, newQuestion()],
            }))
          }
        >
          <Plus size={16} /> Add question
        </button>
        {!isNew && (
          <LessonQuizRevisions
            quizId={quiz.id}
            onRestored={(restored) => {
              setDraft(restored);
              onSaved(restored);
            }}
          />
        )}
        <div className="mt-6 flex justify-end gap-3 border-t pt-5">
          <button
            type="button"
            className="admin-secondary-button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="admin-primary-button"
            disabled={save.isPending || !valid}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Saving…' : 'Save quiz'}
          </button>
        </div>
        {save.error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            Quiz could not be saved. Complete every question, option, and
            correct-answer selection.
          </p>
        )}
      </div>
      {importOpen && (
        <QuestionImportDialog
          existing={draft.questions}
          importedQuestionIDs={importedQuestionIDs}
          onClose={() => setImportOpen(false)}
          onImport={(questions, ids) => {
            setDraft((current) => ({
              ...current,
              questions: [...current.questions, ...questions],
            }));
            setImportedQuestionIDs((current) => new Set([...current, ...ids]));
            setImportOpen(false);
          }}
        />
      )}
    </div>
  );
}

function QuestionImportDialog({
  existing,
  importedQuestionIDs,
  onClose,
  onImport,
}: {
  existing: AdminLessonQuiz['questions'];
  importedQuestionIDs: Set<string>;
  onClose: () => void;
  onImport: (questions: AdminLessonQuiz['questions'], ids: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const questions = useQuery({ queryKey: ['question-bank-import'], queryFn: () => adminAPI.listQuestions({ limit: 100 }) });
  const visible = (questions.data?.questions ?? []).filter((question) =>
    (!topic || question.topicId === topic) &&
    (!search || question.text.toLowerCase().includes(search.toLowerCase())),
  );
  const topics = [...new Set((questions.data?.questions ?? []).map((question) => question.topicId))].sort();
  const add = () => {
    const chosen = (questions.data?.questions ?? []).filter((question) => selected.has(question.id));
    onImport(chosen.map(questionToLessonQuizQuestion), chosen.map((question) => question.id));
  };
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="import-question-title">
      <div className="mx-auto my-8 max-w-4xl rounded-2xl bg-white p-5 shadow-xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="import-question-title" className="text-xl font-bold">Import question-bank questions</h2><p className="mt-1 text-sm text-slate-600">Select one or more questions to create independent snapshots in this lesson quiz.</p></div>
          <button type="button" className="wysiwyg-tool" aria-label="Close question import" onClick={onClose}><X /></button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_12rem]">
          <input className="admin-field" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search question text" aria-label="Search question bank" />
          <select className="admin-field" value={topic} onChange={(event) => setTopic(event.target.value)} aria-label="Filter question bank by topic">
            <option value="">All topics</option>{topics.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div className="mt-4 max-h-[52vh] space-y-2 overflow-y-auto">
          {questions.isPending && <p className="text-sm text-slate-600">Loading question bank…</p>}
          {questions.error && <p role="alert" className="text-sm text-red-700">Question bank could not be loaded.</p>}
          {!questions.isPending && !questions.error && visible.map((question) => {
            const unavailable = importedQuestionIDs.has(question.id) || existing.some((item) => item.sourceQuestionId === question.id);
            return <QuestionImportRow key={question.id} question={question} checked={selected.has(question.id)} disabled={unavailable} onChange={() => setSelected((current) => { const next = new Set(current); next.has(question.id) ? next.delete(question.id) : next.add(question.id); return next; })} />;
          })}
          {!questions.isPending && !questions.error && visible.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No matching question-bank questions.</p>}
        </div>
        <div className="mt-5 flex justify-end gap-3"><button type="button" className="admin-secondary-button" onClick={onClose}>Cancel</button><button type="button" className="admin-primary-button" disabled={selected.size === 0} onClick={add}>Import {selected.size || ''} question{selected.size === 1 ? '' : 's'}</button></div>
      </div>
    </div>
  );
}

function QuestionImportRow({ question, checked, disabled, onChange }: { question: AdminQuestion; checked: boolean; disabled: boolean; onChange: () => void }) {
  const media = useQuery({ queryKey: ['question-import-media', question.id], queryFn: () => adminAPI.contentMedia('question', question.id), staleTime: 60_000 });
  return <label className={`flex gap-3 rounded-xl border p-3 ${disabled ? 'bg-slate-50 opacity-60' : 'cursor-pointer hover:border-ocean/40'}`}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="mt-1" />
    <div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2 text-xs text-slate-500"><span>{question.topicId}</span><span>·</span><span>{question.type === 'multiple_choice' ? 'Multiple select' : 'Single select'}</span>{disabled && <span>· Already imported</span>}</div><p className="mt-1 line-clamp-2 font-semibold">{question.text.replace(/[#*_]/g, '')}</p>{media.data?.media[0] && <div className="mt-2 max-w-40"><MediaPreview asset={media.data.media[0]} /></div>}</div>
  </label>;
}

function questionToLessonQuizQuestion(question: AdminQuestion): AdminLessonQuiz['questions'][number] {
  const correct = new Set(question.type === 'multiple_choice' ? question.correctAnswerIds : [question.correctAnswerId]);
  return { id: newID('lesson-quiz-question'), sourceQuestionId: question.id, text: question.text, type: question.type === 'multiple_choice' ? 'multi_select' : 'single_select', explanation: question.explanationNl, options: question.options.map((option) => ({ id: newID('lesson-quiz-option'), text: option.text, correct: correct.has(option.id) })) };
}

const MediaAssetNode = Node.create({
  name: 'mediaAsset',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      mediaId: { default: '' },
      width: { default: 100 },
      align: { default: 'center' },
      title: { default: '' },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-rich-media-id]',
        getAttrs: (element) => {
          const target = element as HTMLElement;
          return {
            mediaId: target.dataset.richMediaId ?? '',
            width: Number(target.dataset.richMediaWidth ?? 100),
            align: target.dataset.richMediaAlign ?? 'center',
            title: target.dataset.richMediaTitle ?? '',
          };
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        'data-rich-media-id': HTMLAttributes.mediaId,
        'data-rich-media-width': HTMLAttributes.width,
        'data-rich-media-align': HTMLAttributes.align,
        'data-rich-media-title': HTMLAttributes.title,
      },
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(EditorMedia);
  },
});
const extensions = [
  StarterKit.configure({ link: false }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { rel: 'noopener noreferrer' },
  }),
  MediaAssetNode,
  LessonQuizNode,
];

function EditorMedia({
  node,
  deleteNode,
  selected,
  updateAttributes,
  editor,
  getPos,
}: NodeViewProps) {
  const mediaID = String(node.attrs.mediaId);
  const width = Math.min(100, Math.max(25, Number(node.attrs.width) || 100));
  const align = String(node.attrs.align || 'center');
  const title = String(node.attrs.title || '');
  const media = useQuery({
    queryKey: ['admin-media-inline', mediaID],
    queryFn: () => adminAPI.getMedia(mediaID),
    enabled: Boolean(mediaID),
    retry: false,
  });
  const placement: React.CSSProperties =
    align === 'left'
      ? { float: 'left', margin: '0 1.5rem 1rem 0' }
      : align === 'right'
        ? { float: 'right', margin: '0 0 1rem 1.5rem' }
        : { clear: 'both', marginLeft: 'auto', marginRight: 'auto' };
  const move = (direction: -1 | 1) => {
    const position = getPos();
    if (typeof position !== 'number') return;
    const resolved = editor.state.doc.resolve(position);
    if (direction < 0) {
      const previous = resolved.nodeBefore;
      if (!previous) return;
      editor.view.dispatch(
        editor.state.tr
          .delete(position, position + node.nodeSize)
          .insert(position - previous.nodeSize, node),
      );
    } else {
      const next = editor.state.doc.resolve(position + node.nodeSize).nodeAfter;
      if (!next) return;
      editor.view.dispatch(
        editor.state.tr
          .delete(position, position + node.nodeSize)
          .insert(position + next.nodeSize, node),
      );
    }
  };
  return (
    <NodeViewWrapper
      className={`my-4 rounded-2xl border-2 bg-slate-50 p-3 transition ${selected ? 'border-ocean shadow-sm' : 'border-transparent'}`}
      style={{ width: `${width}%`, ...placement }}
    >
      <div contentEditable={false}>
        {media.isPending ? (
          <div className="h-36 animate-pulse rounded-xl bg-slate-200" />
        ) : media.data ? (
          <>
            {title && (
              <h3 className="mb-2 text-lg font-bold text-ink">{title}</h3>
            )}
            <MediaPreview asset={media.data} />
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-white p-2">
              <label className="w-full text-xs font-semibold text-slate-600">
                Media title
                <input
                  aria-label="Media title"
                  value={title}
                  onChange={(event) =>
                    updateAttributes({ title: event.target.value })
                  }
                  className="admin-field mt-1"
                  placeholder="Optional heading shown to learners"
                />
              </label>
              <button
                type="button"
                data-drag-handle
                className="wysiwyg-tool cursor-grab"
                aria-label="Drag media to move"
              >
                <GripVertical />
              </button>
              <button
                type="button"
                onClick={() => move(-1)}
                className="wysiwyg-tool"
                aria-label="Move media up"
              >
                <ArrowUp />
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                className="wysiwyg-tool"
                aria-label="Move media down"
              >
                <ArrowDown />
              </button>
              <span className="h-6 w-px bg-slate-200" />
              <button
                type="button"
                onClick={() => updateAttributes({ align: 'left' })}
                className={`wysiwyg-tool ${align === 'left' ? 'wysiwyg-tool-active' : ''}`}
                aria-label="Wrap text on right"
              >
                <AlignLeft />
              </button>
              <button
                type="button"
                onClick={() => updateAttributes({ align: 'center' })}
                className={`wysiwyg-tool ${align === 'center' ? 'wysiwyg-tool-active' : ''}`}
                aria-label="Center media without text wrapping"
              >
                <AlignCenter />
              </button>
              <button
                type="button"
                onClick={() => updateAttributes({ align: 'right' })}
                className={`wysiwyg-tool ${align === 'right' ? 'wysiwyg-tool-active' : ''}`}
                aria-label="Wrap text on left"
              >
                <AlignRight />
              </button>
              <label className="ml-auto flex min-w-40 items-center gap-2 text-xs font-semibold text-slate-600">
                Width{' '}
                <input
                  aria-label="Media width"
                  type="range"
                  min="25"
                  max="100"
                  step="5"
                  value={width}
                  onChange={(event) =>
                    updateAttributes({ width: Number(event.target.value) })
                  }
                  className="accent-ocean"
                />
                <output>{width}%</output>
              </label>
              <button
                type="button"
                onClick={deleteNode}
                className="wysiwyg-tool text-red-700"
                aria-label="Remove embedded media"
              >
                <Trash2 />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <span>Media {mediaID} could not be loaded.</span>
            <button type="button" onClick={deleteNode}>
              <Trash2 size={17} />
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export function RichTextEditor({
  value,
  onChange,
  label,
  lessonId,
  minHeight = '10rem',
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  minHeight?: string;
  lessonId?: string;
}) {
  const [mediaOpen, setMediaOpen] = useState(false);
  const [quizDraft, setQuizDraft] = useState<AdminLessonQuiz>();
  const [insertQuizAfterSave, setInsertQuizAfterSave] = useState(false);
  const editor = useEditor({
    extensions,
    content: markdownToHTML(value),
    editorProps: {
      attributes: {
        class: 'wysiwyg-surface prose prose-slate max-w-none',
        role: 'textbox',
        'aria-label': label,
      },
    },
    onUpdate: ({ editor }) => onChange(htmlToMarkdown(editor.getHTML())),
  });
  useEffect(() => {
    if (
      editor &&
      !editor.isFocused &&
      htmlToMarkdown(editor.getHTML()) !== value
    )
      editor.commands.setContent(markdownToHTML(value), { emitUpdate: false });
  }, [editor, value]);
  useEffect(() => {
    const openQuiz = async (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      try {
        setInsertQuizAfterSave(false);
        setQuizDraft(await adminAPI.lessonQuiz(id));
      } catch {
        window.alert('This embedded quiz could not be loaded.');
      }
    };
    window.addEventListener('rijfiks:edit-lesson-quiz', openQuiz);
    return () =>
      window.removeEventListener('rijfiks:edit-lesson-quiz', openQuiz);
  }, []);
  if (!editor)
    return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;
  const link = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const href = window.prompt('Link URL', previous ?? 'https://');
    if (href === null) return;
    if (!href) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    if (/^https?:\/\//.test(href))
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };
  const button = (
    name: string,
    active: boolean,
    action: () => void,
    icon: React.ReactNode,
  ) => (
    <button
      type="button"
      aria-label={name}
      aria-pressed={active}
      onClick={action}
      className={`wysiwyg-tool ${active ? 'wysiwyg-tool-active' : ''}`}
    >
      {icon}
    </button>
  );
  const insertMedia = (mediaId: string) => {
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'mediaAsset',
        attrs: { mediaId, width: 100, align: 'center', title: '' },
      })
      .run();
    setMediaOpen(false);
  };
  const insertQuiz = () => {
    if (!lessonId) {
      window.alert('Save this lesson before inserting a quiz.');
      return;
    }
    setInsertQuizAfterSave(true);
    setQuizDraft({
      id: newID('lesson-quiz'),
      lessonId,
      title: 'Quick check',
      questions: [newQuestion()],
    });
  };
  const quizSaved = (saved: AdminLessonQuiz) => {
    if (insertQuizAfterSave)
      editor
        .chain()
        .focus()
        .insertContent({ type: 'lessonQuiz', attrs: { quizId: saved.id } })
        .run();
    setQuizDraft(undefined);
    setInsertQuizAfterSave(false);
  };
  return (
    <>
      <div
        className="wysiwyg"
        style={{ '--editor-min-height': minHeight } as React.CSSProperties}
      >
        <div
          className="wysiwyg-toolbar"
          role="toolbar"
          aria-label={`${label} formatting`}
        >
          {button(
            'Bold',
            editor.isActive('bold'),
            () => editor.chain().focus().toggleBold().run(),
            <Bold />,
          )}
          {button(
            'Italic',
            editor.isActive('italic'),
            () => editor.chain().focus().toggleItalic().run(),
            <Italic />,
          )}
          {button(
            'Heading 1',
            editor.isActive('heading', { level: 1 }),
            () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
            <Heading1 />,
          )}
          {button(
            'Heading 2',
            editor.isActive('heading', { level: 2 }),
            () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            <Heading2 />,
          )}
          {button(
            'Bullet list',
            editor.isActive('bulletList'),
            () => editor.chain().focus().toggleBulletList().run(),
            <List />,
          )}
          {button(
            'Numbered list',
            editor.isActive('orderedList'),
            () => editor.chain().focus().toggleOrderedList().run(),
            <ListOrdered />,
          )}
          {button(
            'Quote',
            editor.isActive('blockquote'),
            () => editor.chain().focus().toggleBlockquote().run(),
            <Quote />,
          )}
          {button('Link', editor.isActive('link'), link, <LinkIcon />)}
          {button(
            'Insert media',
            false,
            () => setMediaOpen(true),
            <ImageIcon />,
          )}
          {button('Insert quiz', false, insertQuiz, <CircleHelp />)}
          <span className="mx-1 h-6 w-px bg-slate-200" />
          {button(
            'Clear formatting',
            false,
            () => editor.chain().focus().clearNodes().unsetAllMarks().run(),
            <RemoveFormatting />,
          )}
          {button(
            'Undo',
            false,
            () => editor.chain().focus().undo().run(),
            <Undo2 />,
          )}
          {button(
            'Redo',
            false,
            () => editor.chain().focus().redo().run(),
            <Redo2 />,
          )}
        </div>
        <EditorContent editor={editor} />
      </div>
      {mediaOpen && (
        <InlineMediaDialog
          onClose={() => setMediaOpen(false)}
          onSelect={insertMedia}
        />
      )}
      {quizDraft && (
        <LessonQuizDialog
          quiz={quizDraft}
          isNew={insertQuizAfterSave}
          onClose={() => setQuizDraft(undefined)}
          onSaved={quizSaved}
        />
      )}
    </>
  );
}

// markdownToHTML escapes source text before adding the small supported tag set.
// Rendering that output directly avoids creating a ProseMirror editor instance
// for every question in long quiz and exam review lists.
const mediaToken =
  /^\[\[media:([A-Za-z0-9_-]+)(?:\|width=(\d{1,3}))?(?:\|align=(left|center|right))?(?:\|title=([^\]|]*))?\]\]$/;
const decodedTitle = (value: string | undefined) => {
  try {
    return decodeURIComponent(value ?? '');
  } catch {
    return '';
  }
};
const lessonQuizToken = /^\[\[lesson-quiz:([A-Za-z0-9_-]+)\]\]$/;
export function RichTextContent({
  value,
  className = '',
  lessonId,
}: {
  value: string;
  className?: string;
  lessonId?: string;
}) {
  const parts = value.split(
    /(\[\[media:[A-Za-z0-9_-]+(?:\|width=\d{1,3})?(?:\|align=(?:left|center|right))?(?:\|title=[^\]|]*)?\]\]|\[\[lesson-quiz:[A-Za-z0-9_-]+\]\])/g,
  );
  return (
    <div className={`flow-root space-y-4 ${className}`}>
      {parts.map((part, index) => {
        const match = part.match(mediaToken);
        const quiz = part.match(lessonQuizToken);
        return quiz ? (
          lessonId ? (
            <EmbeddedLessonQuiz
              key={`${quiz[1]}-${index}`}
              lessonId={lessonId}
              quizId={quiz[1]}
            />
          ) : (
            <div key={index} className="rounded-xl bg-amber-50 p-3 text-sm">
              Lesson quiz unavailable outside a lesson.
            </div>
          )
        ) : match ? (
          <EmbeddedMedia
            key={`${match[1]}-${index}`}
            mediaId={match[1]}
            width={Number(match[2] ?? 100)}
            align={match[3] ?? 'center'}
            title={decodedTitle(match[4])}
          />
        ) : part ? (
          <div
            key={index}
            className="prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: markdownToHTML(part) }}
          />
        ) : null;
      })}
    </div>
  );
}

function EmbeddedMedia({
  mediaId,
  width,
  align,
  title,
}: {
  mediaId: string;
  width: number;
  align: string;
  title: string;
}) {
  const media = useQuery({
    queryKey: ['media-access', mediaId],
    queryFn: () => learningAPI.mediaAccess(mediaId),
    retry: false,
    staleTime: 60_000,
  });
  const safeWidth = Math.min(100, Math.max(25, width));
  const placement: React.CSSProperties =
    align === 'left'
      ? { float: 'left', margin: '0 1.5rem 1rem 0' }
      : align === 'right'
        ? { float: 'right', margin: '0 0 1rem 1.5rem' }
        : { clear: 'both', marginLeft: 'auto', marginRight: 'auto' };
  if (media.isPending)
    return (
      <div
        className="h-40 animate-pulse rounded-2xl bg-slate-100"
        style={{ width: `${safeWidth}%`, ...placement }}
      />
    );
  if (!media.data)
    return (
      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        Embedded media is unavailable.
      </div>
    );
  return (
    <section
      style={{ width: `${safeWidth}%`, ...placement }}
      aria-label={title || media.data.media.altText}
    >
      {title && <h3 className="mb-2 text-lg font-bold text-ink">{title}</h3>}
      <MediaPreview asset={media.data.media} />
    </section>
  );
}

function InlineMediaDialog({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const media = useQuery({
    queryKey: ['inline-media-library', search, kind],
    queryFn: () => adminAPI.media({ search, kind, status: 'available' }),
  });
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Insert media"
      className="fixed inset-0 z-[70] grid place-items-center bg-ink/65 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Insert media</h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose an existing private asset. It will remain reusable and
              securely resolved.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close media picker"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <label className="relative flex-1">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={17}
            />
            <input
              autoFocus
              aria-label="Search insert media"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="admin-field mt-0 pl-9"
              placeholder="Search filename, caption or alt text"
            />
          </label>
          <select
            aria-label="Filter insert media"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className="admin-field mt-0 w-auto"
          >
            <option value="">All media</option>
            <option value="image">Images</option>
            <option value="gif">GIFs</option>
            <option value="video">Videos</option>
          </select>
        </div>
        {media.isPending ? (
          <div className="mt-5 h-48 animate-pulse rounded-xl bg-slate-100" />
        ) : media.error ? (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">
            Media library could not be loaded.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {media.data?.media.map((asset) => (
              <button
                type="button"
                key={asset.id}
                onClick={() => onSelect(asset.id)}
                className="overflow-hidden rounded-xl border text-left transition hover:border-ocean hover:ring-2 hover:ring-teal-100"
              >
                <div className="h-36 bg-slate-100">
                  {asset.kind === 'video' ? (
                    <div className="grid h-full place-items-center">
                      <Film className="text-ocean" size={32} />
                    </div>
                  ) : (
                    <img
                      src={asset.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="p-3">
                  <strong className="line-clamp-1">
                    {asset.originalFilename || asset.altText}
                  </strong>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {asset.altText}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
