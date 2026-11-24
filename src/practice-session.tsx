import { useMutation } from '@tanstack/react-query';
import { Bookmark, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { learningAPI } from './api/learning';
import type { AnswerResult, QuestionView } from './api/types';
import { ErrorState } from './components';
import { LearnerMedia } from './media';
import { RichTextContent } from './rich-text';
import { useNotifications } from './notifications';

interface PracticeState {
  index: number;
  answers: Record<string, string[]>;
  results: Record<string, AnswerResult>;
  finished: boolean;
}

const initialState: PracticeState = {
  index: 0,
  answers: {},
  results: {},
  finished: false,
};

function readState(key: string): PracticeState {
  try {
    const value = sessionStorage.getItem(key);
    return value
      ? { ...initialState, ...(JSON.parse(value) as PracticeState) }
      : initialState;
  } catch {
    return initialState;
  }
}

export interface PracticeResult {
  correct: number;
  total: number;
  percentage: number;
  passed: boolean;
}
export function PracticeSession({
  questions,
  storageKey,
  heading,
  context,
  inline = false,
  initialQuestionID,
  lessonId,
  passingPercentage,
  onFinished,
}: {
  questions: QuestionView[];
  storageKey: string;
  heading: string;
  context: string[];
  inline?: boolean;
  initialQuestionID?: string;
  lessonId?: string;
  passingPercentage?: number;
  onFinished?: (result: PracticeResult) => void;
}) {
  const notifications = useNotifications();
  const [state, setState] = useState<PracticeState>(() => {
    const saved = readState(storageKey);
    const requestedIndex = initialQuestionID
      ? questions.findIndex((item) => item.id === initialQuestionID)
      : -1;
    return requestedIndex >= 0
      ? { ...saved, index: requestedIndex, finished: false }
      : saved;
  });
  const index = Math.min(state.index, Math.max(questions.length - 1, 0));
  const question = questions[index];
  const selected = state.answers[question?.id] ?? [];
  const result = state.results[question?.id];
  const answer = useMutation({
    mutationFn: () => learningAPI.answer(question.id, selected, lessonId),
    onSuccess: (value) =>
      setState((current) => ({
        ...current,
        results: { ...current.results, [question.id]: value },
      })),
    onError: () =>
      notifications.error(
        'Your answer could not be checked. Try again.',
        `answer:${question?.id}`,
      ),
  });
  const bookmark = useMutation({
    mutationFn: () => learningAPI.toggleBookmark(question.id),
    onSuccess: (value) =>
      value.bookmarked
        ? notifications.success('Bookmark added.', `bookmark:${question.id}`)
        : notifications.info('Bookmark removed.', `bookmark:${question.id}`),
    onError: () =>
      notifications.error(
        'Bookmark could not be updated.',
        `bookmark-error:${question.id}`,
      ),
  });

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify({ ...state, index }));
  }, [index, state, storageKey]);

  if (!questions.length)
    return (
      <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        No practice questions are linked to this lesson yet.
      </p>
    );

  const answered = Object.keys(state.results).filter((id) =>
    questions.some((item) => item.id === id),
  );
  const correct = answered.filter((id) => state.results[id]?.correct).length;
  const percentage = questions.length
    ? Math.round((correct / questions.length) * 100)
    : 0;
  const passed =
    passingPercentage === undefined || percentage >= passingPercentage;
  const retry = () => {
    sessionStorage.removeItem(storageKey);
    answer.reset();
    setState(initialState);
  };

  if (state.finished)
    return (
      <section
        className={`${inline ? 'mt-6' : ''} rounded-2xl border border-teal-200 bg-teal-50 p-6`}
        aria-live="polite"
      >
        <p className="font-bold text-ocean">PRACTICE COMPLETE</p>
        <h2 className="mt-1 text-2xl font-bold">
          {correct} of {questions.length} correct ({percentage}%)
        </h2>
        <p className="mt-2 text-slate-700">
          {passed
            ? 'You passed this lesson practice.'
            : `You need at least ${passingPercentage}% to complete the lesson. Review the explanations and retry.`}
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-ocean px-4 py-3 font-bold text-white"
        >
          <RotateCcw size={18} /> Retry practice
        </button>
      </section>
    );

  const select = (id: string) =>
    setState((current) => {
      const currentSelection = current.answers[question.id] ?? [];
      const next =
        question.type === 'multiple_choice'
          ? currentSelection.includes(id)
            ? currentSelection.filter((value) => value !== id)
            : [...currentSelection, id]
          : [id];
      return {
        ...current,
        answers: { ...current.answers, [question.id]: next },
      };
    });

  return (
    <section
      aria-labelledby={`${storageKey}-heading`}
      className={inline ? 'mt-5' : ''}
    >
      <nav
        aria-label="Practice context"
        className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500"
      >
        {context.map((item, itemIndex) => (
          <span
            key={`${item}-${itemIndex}`}
            className="inline-flex items-center gap-2"
          >
            {itemIndex > 0 && <span aria-hidden="true">→</span>}
            {item}
          </span>
        ))}
      </nav>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="font-bold text-ocean">PRACTICE</p>
          <h2 id={`${storageKey}-heading`} className="text-2xl font-bold">
            {heading}
          </h2>
        </div>
        <strong className="shrink-0 text-sm text-slate-600">
          Question {index + 1} of {questions.length}
        </strong>
      </div>
      <div
        className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200"
        aria-label={`${Math.round(((index + 1) / questions.length) * 100)} percent through practice`}
      >
        <div
          className="h-full rounded-full bg-teal-500 transition-all"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>
      <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="text-lg font-semibold">
            <RichTextContent value={question.text} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Add or remove bookmark"
              disabled={bookmark.isPending}
              onClick={() => bookmark.mutate()}
              className="rounded-full border p-2 text-ocean hover:bg-sky disabled:opacity-50"
            >
              <Bookmark size={17} />
            </button>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold uppercase text-slate-500">
              {question.difficulty}
            </span>
          </div>
        </div>
        <LearnerMedia type="question" contentId={question.id} />
        <div
          className="mt-4 grid gap-3"
          role={question.type === 'multiple_choice' ? 'group' : 'radiogroup'}
          aria-label="Answer choices"
        >
          {question.options.map((option, optionIndex) => {
            const active = selected.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                disabled={Boolean(result)}
                onClick={() => select(option.id)}
                aria-pressed={active}
                className={`flex min-h-14 items-center gap-3 rounded-xl border-2 p-3 text-left transition sm:p-4 ${active ? 'border-ocean bg-sky' : 'border-slate-200 hover:border-teal-300'} ${result ? 'cursor-default' : ''}`}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border bg-white text-sm font-bold text-ocean">
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                <span>{option.text}</span>
              </button>
            );
          })}
        </div>
        {result && (
          <div
            className={`mt-5 flex gap-3 rounded-xl p-4 ${result.correct ? 'bg-teal-50 text-teal-900' : 'bg-orange-50 text-orange-900'}`}
          >
            {result.correct ? (
              <CheckCircle2 className="shrink-0" />
            ) : (
              <XCircle className="shrink-0" />
            )}
            <div>
              <strong>
                {result.correct
                  ? `Correct — +${result.xpEarned} XP`
                  : 'Not quite'}
              </strong>
              <RichTextContent value={result.explanation} />
            </div>
          </div>
        )}
      </div>
      {answer.error && (
        <div className="mt-4">
          <ErrorState message="Your answer could not be checked. Try again." />
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="rounded-xl border border-ocean px-4 py-3 font-bold text-ocean disabled:opacity-40"
          disabled={index === 0}
          onClick={() => {
            answer.reset();
            setState((current) => ({ ...current, index: index - 1 }));
          }}
        >
          Previous
        </button>
        {!result ? (
          <button
            type="button"
            className="rounded-xl bg-ocean px-5 py-3 font-bold text-white disabled:opacity-50"
            disabled={!selected.length || answer.isPending}
            onClick={() => answer.mutate()}
          >
            {answer.isPending ? 'Checking…' : 'Check answer'}
          </button>
        ) : index < questions.length - 1 ? (
          <button
            type="button"
            className="rounded-xl bg-ocean px-5 py-3 font-bold text-white"
            onClick={() => {
              answer.reset();
              setState((current) => ({ ...current, index: index + 1 }));
            }}
          >
            Next question
          </button>
        ) : (
          <button
            type="button"
            className="rounded-xl bg-teal-700 px-5 py-3 font-bold text-white"
            onClick={() => {
              const summary = {
                correct,
                total: questions.length,
                percentage,
                passed,
              };
              setState((current) => ({ ...current, finished: true }));
              onFinished?.(summary);
              if (passingPercentage !== undefined)
                passed
                  ? notifications.success(
                      'Lesson practice passed.',
                      `practice-pass:${storageKey}`,
                    )
                  : notifications.warning(
                      `Score at least ${passingPercentage}% to complete this lesson.`,
                      `practice-fail:${storageKey}`,
                    );
            }}
          >
            Finish practice
          </button>
        )}
      </div>
    </section>
  );
}
