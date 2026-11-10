import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import {
  adminAPI,
  AdminQuestion,
  AdminScenario,
  ContentAction,
} from './api/admin';
import { authAPI } from './api/auth';
import { AdminLayout, NewItemButton, StatusBadge } from './admin-ui';
import { ErrorState, Loading } from './components';
import { AdminMediaPicker } from './media';
import { RichTextContent, RichTextEditor } from './rich-text';
import { ScenarioEditor } from './scenario-editor';

const questionBlank = (): AdminQuestion => ({
  id: '',
  topicId: '',
  text: '',
  difficulty: 'easy',
  type: 'single_choice',
  options: [
    { id: 'a', text: '' },
    { id: 'b', text: '' },
  ],
  correctAnswerId: 'a',
  correctAnswerIds: ['a'],
  explanationNl: '',
  explanationEn: '',
  status: 'draft',
  version: 0,
  sourceReference: '',
  flaggedForReview: false,
});
const scenarioBlank = (): AdminScenario => ({
  id: '',
  title: '',
  topicId: '',
  difficulty: 'easy',
  description: '',
  mediaType: 'image',
  mediaId: '',
  questionText: '',
  questionType: 'single_select',
  options: [
    { id: 'a', text: '' },
    { id: 'b', text: '' },
  ],
  correctAnswerIds: ['a'],
  explanation: '',
  examEligible: true,
  status: 'draft',
  version: 0,
  flaggedForReview: false,
});
const transitionedStatus = (action: ContentAction) =>
  action === 'submit-review'
    ? 'in_review'
    : action === 'publish'
      ? 'published'
      : 'archived';

function TopicSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const topics = useQuery({
    queryKey: ['admin-topics'],
    queryFn: adminAPI.topics,
  });
  return (
    <select
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="admin-field"
    >
      <option value="">Choose a topic…</option>
      {topics.data?.topics.map((topic) => (
        <option key={topic.id} value={topic.id}>
          {topic.titleNl}
        </option>
      ))}
    </select>
  );
}

export function AdminQuestionsPage() {
  const me = useQuery({ queryKey: ['me'], queryFn: authAPI.me, retry: false });
  const questions = useQuery({
    queryKey: ['admin-questions'],
    queryFn: adminAPI.questions,
    enabled: me.data?.role === 'admin',
  });
  const client = useQueryClient();
  const [item, setItem] = useState(questionBlank());
  const [validation, setValidation] = useState('');
  const save = useMutation({
    mutationFn: () =>
      item.version
        ? adminAPI.updateQuestion(item)
        : adminAPI.createQuestion(item),
    onSuccess: (saved) => {
      client.invalidateQueries({ queryKey: ['admin-questions'] });
      setItem(saved);
      setValidation('');
    },
  });
  const transition = useMutation({
    mutationFn: (action: ContentAction) =>
      adminAPI.transition('questions', item.id, action, item.version),
    onSuccess: (_data, action) => {
      client.invalidateQueries({ queryKey: ['admin-questions'] });
      setItem((value) => ({
        ...value,
        status: transitionedStatus(action),
        version: value.version + 1,
      }));
    },
  });
  if (me.isPending || questions.isPending) return <Loading />;
  if (!me.data || me.data.role !== 'admin')
    return <Navigate to="/dashboard" replace />;
  if (!questions.data)
    return <ErrorState message="Questions could not be loaded." />;
  const selectedCorrectAnswerIDs =
    item.type === 'multiple_choice'
      ? item.correctAnswerIds ?? []
      : item.correctAnswerId
        ? [item.correctAnswerId]
        : [];
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const hasValidCorrectAnswer =
      item.type === 'multiple_choice'
        ? selectedCorrectAnswerIDs.length > 0
        : selectedCorrectAnswerIDs.length === 1;
    if (
      !item.id ||
      !item.topicId ||
      !item.text ||
      !item.explanationNl ||
      item.options.some((option) => !option.text) ||
      !hasValidCorrectAnswer
    ) {
      setValidation(
        item.type === 'multiple_choice'
          ? 'Complete question, explanation, options and at least one correct answer.'
          : 'Complete question, explanation, options and correct answer.',
      );
      return;
    }
    save.mutate();
  };
  return (
    <AdminLayout
      title="Questions"
      description="Compose the complete learner experience with formatted copy, answer choices and reusable media."
      action={
        <NewItemButton
          label="New question"
          onClick={() => setItem(questionBlank())}
        />
      }
    >
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(18rem,.65fr)_minmax(0,1.35fr)]">
        <section className="admin-card max-h-[75vh] overflow-y-auto p-2">
          {questions.data.questions.map((question) => (
            <button
              type="button"
              key={question.id}
              onClick={() => setItem(question)}
              className={`mb-1 block w-full rounded-xl p-3 text-left ${item.id === question.id ? 'bg-sky ring-1 ring-ocean' : 'hover:bg-slate-50'}`}
            >
              <div className="flex gap-2">
                <strong className="line-clamp-2 flex-1">
                  {question.text.replace(/[#*_]/g, '')}
                </strong>
                <StatusBadge status={question.status} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {question.topicId} · v{question.version}
              </p>
            </button>
          ))}
        </section>
        <form onSubmit={submit} className="admin-card space-y-5">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-bold">
                {item.version ? 'Edit question' : 'Create question'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Formatting and media preview exactly as learners will see them.
              </p>
            </div>
            {item.version > 0 && <StatusBadge status={item.status} />}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="admin-label">
              Question ID
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
              <TopicSelect
                value={item.topicId}
                onChange={(topicId) => setItem({ ...item, topicId })}
              />
            </label>
            <label className="admin-label">
              Difficulty
              <select
                value={item.difficulty}
                onChange={(e) =>
                  setItem({
                    ...item,
                    difficulty: e.target.value as AdminQuestion['difficulty'],
                  })
                }
                className="admin-field"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
              </select>
            </label>
            <label className="admin-label">
              Question type
              <select
                value={item.type}
                onChange={(e) => {
                  const nextType = e.target.value as AdminQuestion['type'];
                  const nextCorrectAnswerIds =
                    nextType === 'multiple_choice'
                      ? item.correctAnswerIds?.length
                        ? item.correctAnswerIds
                        : item.correctAnswerId
                          ? [item.correctAnswerId]
                          : []
                      : item.correctAnswerId
                        ? [item.correctAnswerId]
                        : [];
                  setItem({
                    ...item,
                    type: nextType,
                    correctAnswerId:
                      nextType === 'single_choice' ? nextCorrectAnswerIds[0] ?? '' : '',
                    correctAnswerIds: nextCorrectAnswerIds,
                  });
                }}
                className="admin-field"
              >
                <option value="single_choice">Single choice</option>
                <option value="multiple_choice">Multiple choice</option>
              </select>
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
          <div>
            <label className="admin-label mb-1">Question prompt</label>
            <RichTextEditor
              label="Question prompt"
              minHeight="8rem"
              value={item.text}
              onChange={(text) => setItem({ ...item, text })}
            />
          </div>
          <fieldset>
            <div className="flex items-center justify-between">
              <legend className="admin-label">
                {item.type === 'multiple_choice'
                  ? 'Answer options — select all correct answers'
                  : 'Answer options — select the correct answer'}
              </legend>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() =>
                  setItem({
                    ...item,
                    options: [
                      ...item.options,
                      {
                        id: `option_${crypto.randomUUID().slice(0, 8)}`,
                        text: '',
                      },
                    ],
                  })
                }
              >
                <Plus className="mr-1 inline" size={15} />
                Add option
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {item.options.map((option, index) => {
                const isCorrect =
                  item.type === 'multiple_choice'
                    ? (item.correctAnswerIds ?? []).includes(option.id)
                    : item.correctAnswerId === option.id;
                const toggleCorrect = () => {
                  if (item.type === 'multiple_choice') {
                    const nextCorrectAnswerIds = (item.correctAnswerIds ?? []).includes(
                      option.id,
                    )
                      ? (item.correctAnswerIds ?? []).filter((id) => id !== option.id)
                      : [...(item.correctAnswerIds ?? []), option.id];
                    setItem({
                      ...item,
                      correctAnswerIds: nextCorrectAnswerIds,
                      correctAnswerId: nextCorrectAnswerIds[0] ?? '',
                    });
                    return;
                  }
                  setItem({
                    ...item,
                    correctAnswerId: option.id,
                    correctAnswerIds: [option.id],
                  });
                };
                return (
                  <label
                    key={option.id}
                    className="flex items-center gap-2 rounded-xl border p-3"
                  >
                    <input
                      type={item.type === 'multiple_choice' ? 'checkbox' : 'radio'}
                      name={item.type === 'multiple_choice' ? `correct-${item.id || 'new'}` : 'correct'}
                      checked={isCorrect}
                      onChange={toggleCorrect}
                    />
                    <input
                      required
                      value={option.text}
                      onChange={(e) =>
                        setItem({
                          ...item,
                          options: item.options.map((value, position) =>
                            position === index
                              ? { ...value, text: e.target.value }
                              : value,
                          ),
                        })
                      }
                      placeholder={`Option ${index + 1}`}
                      className="min-w-0 flex-1 outline-none"
                    />
                    <button
                      type="button"
                      aria-label={`Remove option ${index + 1}`}
                      disabled={item.options.length <= 2}
                      onClick={() => {
                        const options = item.options.filter(
                          (_, position) => position !== index,
                        );
                        const nextCorrectAnswerIds = (item.correctAnswerIds ?? []).filter(
                          (answerId) => answerId !== option.id,
                        );
                        setItem({
                          ...item,
                          options,
                          correctAnswerIds:
                            item.type === 'multiple_choice'
                              ? nextCorrectAnswerIds
                              : nextCorrectAnswerIds.length > 0
                                ? [nextCorrectAnswerIds[0]]
                                : [],
                          correctAnswerId:
                            item.type === 'multiple_choice'
                              ? (nextCorrectAnswerIds[0] ?? '')
                              : item.correctAnswerId === option.id
                                ? (options[0]?.id ?? '')
                                : item.correctAnswerId,
                        });
                      }}
                      className="text-red-700 disabled:opacity-30"
                    >
                      <Trash2 size={17} />
                    </button>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div>
            <label className="admin-label mb-1">Answer explanation</label>
            <RichTextEditor
              label="Question answer explanation"
              minHeight="8rem"
              value={item.explanationNl}
              onChange={(explanationNl) => setItem({ ...item, explanationNl })}
            />
          </div>
          <details open className="rounded-xl border bg-slate-50 p-4">
            <summary className="cursor-pointer font-bold">
              Live learner preview
            </summary>
            <div className="mt-4 rounded-xl bg-white p-5 shadow-sm">
              <RichTextContent
                value={item.text || 'Question prompt appears here'}
              />
              <div className="mt-4 space-y-2">
                {item.options.map((option) => (
                  <div key={option.id} className="rounded-lg border p-3">
                    {option.text || 'Answer option'}
                  </div>
                ))}
              </div>
            </div>
          </details>
          <AdminMediaPicker
            type="question"
            contentId={item.version ? item.id : ''}
          />
          <div className="flex flex-wrap gap-2">
            <button className="admin-primary-button" disabled={save.isPending}>
              {save.isPending
                ? 'Saving…'
                : item.version
                  ? 'Save changes'
                  : 'Create draft'}
            </button>
            {item.version > 0 && (
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
                  onClick={() => transition.mutate('archive')}
                  className="admin-secondary-button"
                >
                  Archive
                </button>
                <Link
                  to={`/admin/questions/${item.id}/revisions`}
                  className="admin-secondary-button"
                >
                  Revision history
                </Link>
              </>
            )}
          </div>
          {(validation || save.error || transition.error) && (
            <ErrorState
              message={validation || 'Question could not be saved.'}
            />
          )}
        </form>
      </div>
    </AdminLayout>
  );
}

export function AdminScenariosPage() {
  const me = useQuery({ queryKey: ['me'], queryFn: authAPI.me, retry: false });
  const scenarios = useQuery({
    queryKey: ['admin-scenarios'],
    queryFn: adminAPI.scenarios,
    enabled: me.data?.role === 'admin',
  });
  const client = useQueryClient();
  const [item, setItem] = useState(scenarioBlank());
  const [validation, setValidation] = useState('');
  const save = useMutation({
    mutationFn: (value: AdminScenario) =>
      value.version
        ? adminAPI.updateScenario(value)
        : adminAPI.createScenario(value),
    onSuccess: (saved) => {
      client.invalidateQueries({ queryKey: ['admin-scenarios'] });
      setItem(saved);
      setValidation('');
    },
  });
  const transition = useMutation({
    mutationFn: (action: ContentAction) =>
      adminAPI.transition('scenarios', item.id, action, item.version),
    onSuccess: (_data, action) => {
      client.invalidateQueries({ queryKey: ['admin-scenarios'] });
      setItem((value) => ({
        ...value,
        status: transitionedStatus(action),
        version: value.version + 1,
      }));
    },
  });
  if (me.isPending || scenarios.isPending) return <Loading />;
  if (!me.data || me.data.role !== 'admin')
    return <Navigate to="/dashboard" replace />;
  if (!scenarios.data)
    return <ErrorState message="Scenarios could not be loaded." />;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (
      !item.id ||
      !item.title ||
      !item.topicId ||
      !item.mediaId ||
      !item.questionText ||
      !item.explanation ||
      !(item.options?.length ?? 0) ||
      (item.questionType === 'single_select' && item.correctAnswerIds?.length !== 1) ||
      (item.questionType === 'multi_select' && (item.correctAnswerIds?.length ?? 0) < 1)
    ) {
      setValidation(
        'Add a title, topic, media asset, question, answer options, correct answer(s), and explanation.',
      );
      return;
    }
    save.mutate(item);
  };
  return (
    <AdminLayout
      title="Scenarios"
      description="Create the scenario with one media asset, a question, and answer validation."
      action={
        <NewItemButton
          label="New scenario"
          onClick={() => setItem(scenarioBlank())}
        />
      }
    >
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(18rem,.55fr)_minmax(0,1.45fr)]">
        <section className="admin-card max-h-[75vh] overflow-y-auto p-2">
          {scenarios.data.scenarios.map((scenario) => (
            <button
              type="button"
              key={scenario.id}
              onClick={() => {
                setItem(scenario);
                setValidation('');
              }}
              className={`mb-1 block w-full rounded-xl p-3 text-left ${item.id === scenario.id ? 'bg-sky ring-1 ring-ocean' : 'hover:bg-slate-50'}`}
            >
              <div className="flex gap-2">
                <strong className="flex-1">{scenario.title}</strong>
                <StatusBadge status={scenario.status} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {scenario.topicId} · v{scenario.version}
              </p>
            </button>
          ))}
        </section>
        <form onSubmit={submit} className="admin-card space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-bold">
                {item.version ? 'Edit scenario' : 'Create scenario'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Choose one media asset, author the question, and keep the
                scenario ready for publishing.
              </p>
            </div>
            {item.version > 0 && <StatusBadge status={item.status} />}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="admin-label">
              Scenario ID
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
              <TopicSelect
                value={item.topicId}
                onChange={(topicId) => setItem({ ...item, topicId })}
              />
            </label>
            <label className="admin-label md:col-span-2">
              Title
              <input
                required
                value={item.title}
                onChange={(e) => setItem({ ...item, title: e.target.value })}
                className="admin-field"
              />
            </label>
            <label className="admin-label">
              Difficulty
              <select
                value={item.difficulty}
                onChange={(event) =>
                  setItem({
                    ...item,
                    difficulty: event.target
                      .value as AdminScenario['difficulty'],
                  })
                }
                className="admin-field"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
              </select>
            </label>
          </div>
          <ScenarioEditor value={item} onChange={setItem} />
          <AdminMediaPicker
            type="scenario"
            contentId={item.version ? item.id : ''}
          />
          <div className="sticky bottom-3 flex flex-wrap gap-2 rounded-xl border bg-white/95 p-3 shadow-lg backdrop-blur">
            <button className="admin-primary-button" disabled={save.isPending}>
              {save.isPending
                ? 'Saving…'
                : item.version
                  ? 'Save changes'
                  : 'Create draft'}
            </button>
            {item.version > 0 && (
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
                  onClick={() => transition.mutate('archive')}
                  className="admin-secondary-button"
                >
                  Archive
                </button>
                <Link
                  to={`/admin/scenarios/${item.id}/revisions`}
                  className="admin-secondary-button"
                >
                  Revision history
                </Link>
              </>
            )}
          </div>
          {(validation || save.error || transition.error) && (
            <ErrorState
              message={validation || 'Scenario could not be saved.'}
            />
          )}
        </form>
      </div>
    </AdminLayout>
  );
}
