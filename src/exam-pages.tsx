import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { examsAPI } from './api/exams';
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
  });
  if (active.data) return <Navigate to={`/exams/${active.data.id}`} replace />;
  return (
    <div className="mx-auto max-w-xl rounded-3xl bg-white p-7 shadow-sm">
      <p className="font-bold text-ocean">INDEPENDENT PRACTICE EXAM</p>
      <h1 className="mt-2 text-3xl font-bold">Category B theory practice</h1>
      <p className="mt-4">
        50 questions · 30 minutes · pass from 44 correct answers.
      </p>
      {start.error && <ErrorState message="Exam could not start." />}
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
  if (isPending) return <Loading />;
  if (error || !data)
    return (
      <ErrorState message="This exam could not be opened. It may have expired; return to the exam page to start again." />
    );
  const question = data.questions[index];
  const selected = question.selectedAnswerId;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex justify-between">
        <strong>
          Question {index + 1}/{data.totalQuestions}
        </strong>
        <strong aria-live="polite">{clock(Math.max(0, seconds))}</strong>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <RichTextContent value={question.text} />
        <HistoricalMedia assets={question.media ?? []} />
        <div className="mt-5 space-y-3">
          {question.options.map((option) => (
            <button
              key={option.id}
              onClick={() =>
                save.mutate({ questionID: question.id, answerID: option.id })
              }
              disabled={save.isPending}
              className={`block w-full rounded-xl border p-4 text-left ${selected === option.id ? 'border-ocean bg-sky-50' : 'hover:border-ocean'}`}
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex justify-between">
        <button
          onClick={() => setIndex(Math.max(0, index - 1))}
          disabled={index === 0}
        >
          Previous
        </button>
        <button
          onClick={() =>
            setIndex(Math.min(data.questions.length - 1, index + 1))
          }
          disabled={index === data.questions.length - 1}
        >
          Next
        </button>
        <button
          onClick={() => {
            if (
              window.confirm(
                'Submit this exam now? Unanswered questions count as incorrect.',
              )
            )
              submit.mutate();
          }}
          disabled={submit.isPending}
          className="rounded-xl bg-ocean px-4 py-3 font-bold text-white"
        >
          Submit exam
        </button>
      </div>
      {submit.error && <ErrorState message="Exam could not be submitted." />}
    </div>
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
