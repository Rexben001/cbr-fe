import { useMutation, useQuery } from '@tanstack/react-query';
import { CarFront, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { learningAPI } from './api/learning';
import { LearnerMedia } from './media';
import { BackLink, ErrorState, Loading } from './components';
import { RichTextContent } from './rich-text';

export function ScenarioListPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ['scenarios'],
    queryFn: learningAPI.listScenarios,
  });
  if (isPending) return <Loading />;
  if (error) return <ErrorState message="Scenarios could not be loaded." />;

  return (
    <>
      <p className="font-bold text-ocean">INTERACTIVE PRACTICE</p>
      <h1 className="text-3xl font-bold">Media-based scenarios</h1>
      <p className="mt-2 text-slate-600">
        Review the media, answer the question, and check the explanation after
        submitting.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {data!.map((s) => (
          <Link
            key={s.id}
            to={`/scenarios/${s.id}`}
            className="rounded-2xl border bg-white p-5 shadow-sm hover:border-teal-300"
          >
            <CarFront className="text-ocean" />
            <span className="mt-4 inline-block rounded-full bg-sky px-2 py-1 text-xs font-bold text-ocean">
              {s.difficulty}
            </span>
            <h2 className="mt-3 text-xl font-bold">{s.title}</h2>
            <p className="mt-3 font-semibold text-ocean">Open scenario →</p>
          </Link>
        ))}
      </div>
    </>
  );
}

export function ScenarioPage() {
  const { scenarioId = '' } = useParams();
  const {
    data: scenario,
    isPending,
    error,
  } = useQuery({
    queryKey: ['scenario', scenarioId],
    queryFn: () => learningAPI.getScenario(scenarioId),
  });
  const [selected, setSelected] = useState<string[]>([]);
  const attempt = useMutation({
    mutationFn: () => learningAPI.attemptScenario(scenarioId, selected),
  });

  if (isPending) return <Loading />;
  if (error || !scenario)
    return <ErrorState message="This scenario could not be loaded." />;

  const questionType = scenario.questionType ?? 'single_select';
  const answerOptions = scenario.options ?? [];

  const retry = () => {
    setSelected([]);
    attempt.reset();
  };

  const toggleSelected = (id: string) => {
    if (questionType === 'single_select') {
      setSelected([id]);
      return;
    }
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  return (
    <>
      <BackLink to="/scenarios">All scenarios</BackLink>
      <p className="font-bold text-ocean">SCENARIO · {scenario.difficulty}</p>
      <h1 className="text-3xl font-bold">{scenario.title}</h1>
      {scenario.description && (
        <p className="mt-2 text-slate-600">{scenario.description}</p>
      )}
      {!scenario.contentReviewed && (
        <p className="mt-2 rounded-lg bg-orange-50 p-3 text-sm text-orange-900">
          Original educational draft — requires legal/content review before
          commercial release.
        </p>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-slate-50 p-4">
          {scenario.mediaId ? (
            <LearnerMedia type="scenario" contentId={scenario.mediaId} />
          ) : (
            <div className="rounded-xl bg-white p-4 text-sm text-slate-600">
              Scenario media preview is unavailable for this item.
            </div>
          )}
        </div>

        <section>
          <h2 className="text-xl font-bold">
            {scenario.questionText || 'What do you do?'}
          </h2>
          <p className="mt-1 text-slate-600">
            {questionType === 'single_select'
              ? 'Choose the single best answer.'
              : 'Select all correct answers.'}
          </p>
          <div className="mt-4 space-y-3">
            {answerOptions.map((option) => (
              <label
                key={option.id}
                className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border p-4 text-left ${selected.includes(option.id) ? 'border-ocean bg-sky' : 'bg-white hover:border-teal-300'}`}
              >
                <input
                  type={questionType === 'single_select' ? 'radio' : 'checkbox'}
                  checked={selected.includes(option.id)}
                  onChange={() => toggleSelected(option.id)}
                  className="mt-1"
                />
                <span>
                  <strong>{option.text}</strong>
                </span>
              </label>
            ))}
          </div>
          <button
            disabled={selected.length === 0 || attempt.isPending || Boolean(attempt.data)}
            onClick={() => attempt.mutate()}
            className="mt-4 rounded-xl bg-ocean px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            {attempt.isPending ? 'Checking…' : 'Commit decision'}
          </button>
          {attempt.data && (
            <div
              aria-live="polite"
              className={`mt-4 rounded-xl p-4 ${attempt.data.correct ? 'bg-teal-50' : 'bg-orange-50'}`}
            >
              <strong>
                {attempt.data.correct
                  ? `Correct! +${attempt.data.xpEarned} XP`
                  : 'Try again: this action is unsafe.'}
              </strong>
              <RichTextContent value={attempt.data.feedback} />
              <p className="mt-2 text-sm font-semibold">
                {attempt.data.ruleReference}
              </p>
              <button
                type="button"
                onClick={retry}
                className="mt-4 inline-flex items-center gap-1 font-bold text-ocean"
              >
                <RotateCcw size={16} />
                Retry
              </button>
            </div>
          )}
          {attempt.error && (
            <ErrorState message="Your decision could not be submitted." />
          )}
        </section>
      </div>
    </>
  );
}
