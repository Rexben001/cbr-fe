import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Flag, Grid2X2, Send } from 'lucide-react';
import { examsAPI } from './api/exams';
import { APIError } from './api/client';
import { ErrorState, Loading } from './components';
import { HistoricalMedia } from './media';
import { RichTextContent } from './rich-text';

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function ExamIntroPage() {
  const navigate = useNavigate();
  const active = useQuery({
    queryKey: ['active-exam'],
    queryFn: examsAPI.active,
    retry: false,
  });
  const start = useMutation({
    mutationFn: examsAPI.start,
    onSuccess: (exam) => navigate(`/exams/${exam.id}`),
    onError: (error) => {
      if (error instanceof APIError && error.status === 409)
        void active.refetch();
    },
  });
  if (active.data) return <Navigate to={`/exams/${active.data.id}`} replace />;
  return (
    <div className="mx-auto max-w-xl rounded-3xl bg-white p-7 shadow-sm">
      <p className="font-bold text-ocean">INDEPENDENT PRACTICE EXAM</p>
      <h1 className="mt-2 text-3xl font-bold">Category B theory practice</h1>
      <p className="mt-4">
        50 questions · 30 minutes · pass from 44 correct answers.
      </p>
      {start.error && <ErrorState message={start.error instanceof APIError ? start.error.message : 'Exam could not start.'} />}
      <button
        onClick={() => start.mutate()}
        disabled={start.isPending}
        className="mt-6 rounded-xl bg-ocean px-5 py-3 font-bold text-white disabled:opacity-60"
      >
        Start exam
      </button>
      <Link
        to="/exams/history"
        className="mt-4 inline-block font-bold text-ocean"
      >
        My exam history →
      </Link>
    </div>
  );
}

export function ExamHistoryPage() {
  const history = useQuery({
    queryKey: ['exam-history'],
    queryFn: examsAPI.history,
  });
  const performance = useQuery({
    queryKey: ['exam-performance'],
    queryFn: examsAPI.performance,
  });
  if (history.isPending || performance.isPending) return <Loading />;
  if (history.error || !history.data || !performance.data)
    return <ErrorState message="Exam history could not be loaded." />;
  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-bold text-ocean">MY EXAMS</p>
      <h1 className="mt-1 text-3xl font-bold">Exam history</h1>
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-sky p-4 sm:grid-cols-4">
        <span>{performance.data.totalCompleted} completed</span>
        <span>{performance.data.passed} passed</span>
        <span>{Math.round(performance.data.passRate)}% pass rate</span>
        <span>{Math.round(performance.data.averageScore)}% average</span>
      </div>
      <p className="mt-3 text-sm text-slate-600">
        Practice results are not a guarantee of an actual CBR exam result.
      </p>
      <div className="mt-6 space-y-3">
        {history.data.map((item) => (
          <Link
            key={item.id}
            to={
              item.status === 'in_progress'
                ? `/exams/${item.id}`
                : `/exams/${item.id}/results`
            }
            className="block rounded-xl border bg-white p-4 hover:border-ocean"
          >
            <strong>
              {item.status === 'completed'
                ? item.passed
                  ? 'Passed'
                  : 'Not passed'
                : item.status}
            </strong>
            <span className="ml-3">{item.percentage}%</span>
            <span className="float-right text-sm text-slate-500">
              {new Date(item.startedAt).toLocaleDateString()}
            </span>
          </Link>
        ))}
        {!history.data.length && (
          <p className="rounded-xl bg-slate-100 p-4">No exam attempts yet.</p>
        )}
      </div>
    </div>
  );
}

export function ExamPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => examsAPI.get(id),
    retry: false,
  });
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(-1);
  const save = useMutation({
    mutationFn: ({
      questionID,
      answerID,
    }: {
      questionID: string;
      answerID: string;
    }) => examsAPI.answer(id, questionID, answerID),
    onSuccess: (exam) => client.setQueryData(['exam', id], exam),
  });
  const submit = useMutation({
    mutationFn: () => examsAPI.submit(id),
    onSuccess: () => {
      client.removeQueries({ queryKey: ['active-exam'] });
      navigate(`/exams/${id}/results`);
    },
  });
  const flag = useMutation({
    mutationFn: ({ questionID, flagged }: { questionID: string; flagged: boolean }) => examsAPI.flag(id, questionID, flagged),
    onSuccess: (exam) => client.setQueryData(['exam', id], exam),
  });
  const submitExam = submit.mutate;
  useEffect(() => {
    if (!data) return;
    const tick = () =>
      setSeconds(
        Math.max(
          0,
          Math.ceil((new Date(data.expiresAt).getTime() - Date.now()) / 1000),
        ),
      );
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [data]);
  useEffect(() => {
    if (data && seconds === 0 && !submit.isPending) submitExam();
  }, [data, seconds, submit.isPending, submitExam]);
  useEffect(() => {
    if (error instanceof APIError && error.status === 410)
      navigate(`/exams/${id}/results`, { replace: true });
  }, [error, id, navigate]);
  useEffect(() => {
    const warnBeforeExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeExit);
    return () => window.removeEventListener('beforeunload', warnBeforeExit);
  }, []);
  if (isPending) return <Loading />;
  if (error || !data)
    return (
      <ErrorState message="This exam could not be opened. It may have expired; return to the exam page to start again." />
    );
  const question = data.questions[index];
  const selected = question.selectedAnswerId;
  return (
    <main className="exam-shell">
      <header className="exam-topbar">
        <span className="exam-brand" aria-label="RijFiks active exam">RijFiks · Category B Practice Exam</span>
        <p aria-live="polite">Resterende tijd <strong>{clock(Math.max(0, seconds))}</strong></p>
        <div className="exam-top-actions">
          <button type="button" disabled={flag.isPending} onClick={() => flag.mutate({ questionID: question.id, flagged: !question.flagged })} aria-pressed={question.flagged} aria-label={question.flagged ? 'Remove question flag' : 'Flag current question'} className={question.flagged ? 'exam-icon-active' : 'exam-icon'}><Flag fill={question.flagged ? 'currentColor' : 'none'} /></button>
          <details className="exam-overview"><summary aria-label="Open question overview"><Grid2X2 /></summary><div className="exam-overview-panel" aria-label="Question overview">{data.questions.map((item, itemIndex) => <button type="button" key={item.id} onClick={() => setIndex(itemIndex)} aria-label={`Question ${itemIndex + 1}${item.selectedAnswerId ? ' answered' : ' unanswered'}${item.flagged ? ' flagged' : ''}`} className={index === itemIndex ? 'current' : item.flagged ? 'flagged' : item.selectedAnswerId ? 'answered' : ''}>{itemIndex + 1}</button>)}</div></details>
          <button type="button" className="exam-icon" onClick={() => { if (window.confirm('Leave this exam? Your saved answers will remain available until the timer ends.')) navigate('/exams'); }} aria-label="Leave exam"><Send /></button>
        </div>
      </header>
      <section className="exam-workspace">
        <div className="exam-visual" aria-label="Question media">
          <HistoricalMedia assets={question.media ?? []} />
          {!question.media?.length && <div className="exam-visual-placeholder">Visual for this question</div>}
        </div>
        <div className="exam-question-area">
          <div className="exam-question-number">Vraag {index + 1} van {data.totalQuestions}</div>
          <div className="exam-prompt"><RichTextContent value={question.text} /></div>
          <div className="exam-answers" role="radiogroup" aria-label="Answer choices">
          {question.options.map((option) => (
            <button
              key={option.id}
              onClick={() =>
                save.mutate({ questionID: question.id, answerID: option.id })
              }
              disabled={save.isPending}
              role="radio"
              aria-checked={selected === option.id}
              className={`exam-answer ${selected === option.id ? 'exam-answer-selected' : ''}`}
            >
              <span className="exam-radio" aria-hidden="true" />
              {option.text}
            </button>
          ))}
        </div>
        </div>
      </section>
      <footer className="exam-footer">
        <button type="button" className="exam-nav exam-nav-previous" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}><ChevronLeft /> Vorige</button>
        <span>Vraag <strong>{index + 1}</strong> van <strong>{data.totalQuestions}</strong></span>
        {index < data.questions.length - 1 ? <button type="button" className="exam-nav exam-nav-next" onClick={() => setIndex(Math.min(data.questions.length - 1, index + 1))}>Volgende <ChevronRight /></button> : <button
          onClick={() => {
            if (
              window.confirm(
                'Submit this exam now? Unanswered questions count as incorrect.',
              )
            )
              submit.mutate();
          }}
          disabled={submit.isPending}
          className="exam-nav exam-nav-next"
        >
          Exam afronden
        </button>}
      </footer>
      {submit.error && <ErrorState message="Exam could not be submitted." />}
    </main>
  );
}

export function ExamResultsPage() {
  const { id = '' } = useParams();
  const {
    data: result,
    isPending,
    error,
  } = useQuery({
    queryKey: ['exam-result', id],
    queryFn: () => examsAPI.result(id),
    retry: false,
  });
  if (isPending) return <Loading />;
  if (error || !result) return <Navigate to="/exams" replace />;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-3xl bg-ink p-7 text-white">
        <p className="font-bold text-sun">EXAM COMPLETE</p>
        <h1 className="text-4xl font-bold">
          {result.passed ? 'Pass' : 'Not passed'}
        </h1>
        <p>
          {result.correctAnswers} correct · {result.incorrectAnswers} incorrect
          · {result.unanswered} unanswered · {result.percentage}%
        </p>
      </div>
      <h2 className="mt-6 text-xl font-bold">Review</h2>
      {result.questions.map((item, i) => (
        <div key={item.question.id} className="mt-3 rounded-xl bg-white p-4">
          <div className="flex gap-2">
            <strong>{i + 1}.</strong>
            <RichTextContent value={item.question.text} />
          </div>
          <div className={item.correct ? 'text-green-700' : 'text-red-700'}>
            <strong>{item.correct ? 'Correct' : 'Incorrect'}</strong>
            <RichTextContent value={item.explanation} />
          </div>
        </div>
      ))}
      <Link
        to="/exams"
        className="mt-6 inline-block rounded-xl bg-ocean px-4 py-3 font-bold text-white"
      >
        Try another exam
      </Link>
    </div>
  );
}
