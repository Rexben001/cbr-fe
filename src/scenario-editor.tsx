import { Check, Film, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AdminScenario } from './api/admin';
import { adminAPI } from './api/admin';

const makeID = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

const defaultOptions = [
  { id: 'a', text: '' },
  { id: 'b', text: '' },
];

export function ScenarioEditor({
  value,
  onChange,
}: {
  value: AdminScenario;
  onChange: (value: AdminScenario) => void;
}) {
  const mediaType = value.mediaType || 'image';
  const questionType = value.questionType || 'single_select';
  const options = value.options?.length ? value.options : defaultOptions;
  const correctIds = value.correctAnswerIds ?? [];
  const setField = <K extends keyof AdminScenario>(key: K, next: AdminScenario[K]) =>
    onChange({ ...value, [key]: next });
  const setFields = (patch: Partial<AdminScenario>) =>
    onChange({ ...value, ...patch });

  const library = useQuery({
    queryKey: ['scenario-media-library', mediaType],
    queryFn: () => adminAPI.media({ kind: mediaType, status: 'available' }),
    initialData: { media: [] },
    staleTime: 30_000,
  });

  const selectedAsset = useMemo(() => {
    const candidates = library.data?.media ?? [];
    return candidates.find((asset) => asset.id === value.mediaId) ?? null;
  }, [library.data, value.mediaId]);

  const updateOption = (index: number, text: string) => {
    const nextOptions = [...options];
    nextOptions[index] = { ...nextOptions[index], text };
    setField('options', nextOptions);
  };

  const addOption = () => {
    const nextOptions = [...options, { id: makeID('option'), text: '' }];
    setField('options', nextOptions);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    const nextOptions = options.filter((option) => option.id !== id);
    const nextCorrectAnswerIds =
      questionType === 'single_select'
        ? nextOptions.length > 0
          ? [nextOptions[0].id]
          : []
        : correctIds.filter((answerId) => answerId !== id);
    setFields({
      options: nextOptions,
      correctAnswerIds: nextCorrectAnswerIds,
    });
  };

  const toggleCorrectAnswer = (optionId: string) => {
    if (questionType === 'single_select') {
      setField('correctAnswerIds', [optionId]);
      return;
    }
    const next = correctIds.includes(optionId)
      ? correctIds.filter((id) => id !== optionId)
      : [...correctIds, optionId];
    setField('correctAnswerIds', next);
  };

  console.log({
    lll: library.data?.media
  })
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold">Media scenario</h3>
            <p className="text-sm text-slate-600">
              Keep the scenario focused on a single image, video or animated GIF.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ocean">
            MODERN SCENARIO
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="admin-label">
            Scenario title
            <input
              value={value.title}
              onChange={(event) => setField('title', event.target.value)}
              className="admin-field"
            />
          </label>
          <label className="admin-label">
            Difficulty
            <select
              value={value.difficulty}
              onChange={(event) =>
                setField('difficulty', event.target.value as AdminScenario['difficulty'])
              }
              className="admin-field"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
            </select>
          </label>
        </div>

        <div className="mt-4">
          <label className="admin-label">
            Scenario description
            <textarea
              value={value.description ?? ''}
              onChange={(event) => setField('description', event.target.value)}
              className="admin-field min-h-24"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="admin-label">
            Media type
            <select
              value={mediaType}
              onChange={(event) => {
                const nextType = event.target.value as AdminScenario['mediaType'];
                setFields({
                  mediaType: nextType,
                  mediaId: '',
                });
              }}
              className="admin-field"
            >
              <option value="image">Static image</option>
              <option value="video">Video</option>
              <option value="gif">Animated GIF</option>
            </select>
          </label>
          <label className="admin-label md:col-span-2">
            Select media
            <select
              value={value.mediaId ?? ''}
              onChange={(event) => setField('mediaId', event.target.value)}
              className="admin-field"
            >
              <option value="">Choose an asset…</option>
              {library.data?.media.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.originalFilename || asset.altText || asset.id}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedAsset && (
          <div className="mt-4 overflow-hidden rounded-2xl border bg-white p-3">
            {selectedAsset.kind === 'video' ? (
              <video
                src={selectedAsset.url}
                controls
                preload="metadata"
                className="max-h-72 w-full rounded-xl bg-black object-contain"
                aria-label={selectedAsset.altText}
              />
            ) : (
              <img
                src={selectedAsset.url}
                alt={selectedAsset.altText || 'Scenario media'}
                className="max-h-72 w-full rounded-xl object-contain"
              />
            )}
            {(selectedAsset.caption || selectedAsset.altText) && (
              <p className="mt-2 text-sm text-slate-600">
                {selectedAsset.caption || selectedAsset.altText}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-slate-50 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="admin-label md:col-span-2">
            Question text
            <textarea
              value={value.questionText ?? ''}
              onChange={(event) => setField('questionText', event.target.value)}
              className="admin-field min-h-20"
            />
          </label>
          <label className="admin-label">
            Question type
            <select
              value={questionType}
              onChange={(event) => {
                const nextType = event.target.value as AdminScenario['questionType'];
                const nextCorrectAnswerIds =
                  nextType === 'single_select' && correctIds.length > 1
                    ? [correctIds[0]]
                    : correctIds;
                setFields({
                  questionType: nextType,
                  correctAnswerIds: nextCorrectAnswerIds,
                });
              }}
              className="admin-field"
            >
              <option value="single_select">Single-select</option>
              <option value="multi_select">Multi-select</option>
            </select>
          </label>
          <label className="admin-label">
            Topic
            <input
              value={value.topicId}
              onChange={(event) => setField('topicId', event.target.value)}
              className="admin-field"
            />
          </label>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold">Answer options</h4>
            <button
              type="button"
              className="admin-secondary-button"
              onClick={addOption}
            >
              <Plus className="mr-1 inline" size={15} />
              Add option
            </button>
          </div>
          {options.map((option, index) => (
            <div
              key={option.id}
              className="rounded-xl border bg-white p-3"
            >
              <div className="flex items-center gap-3">
                <input
                  type={questionType === 'single_select' ? 'radio' : 'checkbox'}
                  name="correct-answer"
                  checked={correctIds.includes(option.id)}
                  onChange={() => toggleCorrectAnswer(option.id)}
                  className="h-4 w-4"
                  aria-label={`Mark option ${index + 1} as correct`}
                />
                <label className="flex-1">
                  <span className="sr-only">Option {index + 1}</span>
                  <input
                    value={option.text}
                    onChange={(event) => updateOption(index, event.target.value)}
                    className="admin-field"
                    placeholder={`Option ${index + 1}`}
                  />
                </label>
                <button
                  type="button"
                  className="text-red-700 disabled:opacity-30"
                  disabled={options.length <= 2}
                  onClick={() => removeOption(option.id)}
                  aria-label={`Remove option ${index + 1}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <label className="admin-label">
            Explanation
            <textarea
              value={value.explanation ?? ''}
              onChange={(event) => setField('explanation', event.target.value)}
              className="admin-field min-h-24"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={Boolean(value.examEligible)}
              onChange={(event) => setField('examEligible', event.target.checked)}
            />
            Mock exam eligible
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={Boolean(value.flaggedForReview)}
              onChange={(event) =>
                setField('flaggedForReview', event.target.checked)
              }
            />
            Flag for review
          </label>
        </div>
      </section>

      <section className="rounded-2xl border bg-slate-50 p-4">
        <h3 className="font-bold">Scenario preview</h3>
        <div className="mt-3 rounded-2xl border bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ocean">
            {mediaType === 'video' ? <Film size={16} /> : mediaType === 'gif' ? <ImageIcon size={16} /> : <ImageIcon size={16} />}
            {value.title || 'Untitled scenario'}
          </div>
          <p className="text-sm text-slate-600">
            {value.description || 'Scenario description preview.'}
          </p>
          {selectedAsset && (
            <div className="mt-3">
              {selectedAsset.kind === 'video' ? (
                <video
                  src={selectedAsset.url}
                  controls
                  controlsList="nodownload"
                  preload="metadata"
                  className="max-h-64 w-full rounded-xl bg-black object-contain"
                />
              ) : (
                <img
                  src={selectedAsset.url}
                  alt={selectedAsset.altText || 'Preview'}
                  className="max-h-64 w-full rounded-xl object-contain"
                />
              )}
            </div>
          )}
          <div className="mt-4 space-y-2">
            <p className="font-semibold">{value.questionText || 'Question preview'}</p>
            {options.map((option) => (
              <label key={option.id} className="flex items-center gap-2 text-sm">
                <input
                  type={questionType === 'single_select' ? 'radio' : 'checkbox'}
                  checked={correctIds.includes(option.id)}
                  readOnly
                />
                <span>{option.text || 'Answer option'}</span>
              </label>
            ))}
          </div>
          {value.explanation && (
            <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
              <div className="flex items-center gap-2 font-semibold">
                <Check size={16} />
                Explanation
              </div>
              <p className="mt-2">{value.explanation}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
