import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Play, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { learningAPI } from './api/learning';
import { authAPI } from './api/auth';
import { APIError } from './api/client';
import type { QuizResult, QuizView } from './api/types';
import { BackLink, ErrorState, Loading, PrimaryLink } from './components';
import { LessonRenderer } from './lesson-blocks';
import { LearnerMedia } from './media';
import { RichTextContent } from './rich-text';
import { PracticeSession } from './practice-session';
import { HighlightableLesson } from './lesson-highlights';
import { RoadmapPage } from './learning-roadmap';
import { TrafficSign, referencedTrafficSignCodes } from './traffic-sign';

const quizKey = (id: string) => `roadready.quiz.${id}`;
const resultKey = (id: string) => `roadready.result.${id}`;

export function Dashboard() {
  return <RoadmapPage />;
}

export function TopicPage() {
  const { topicId = '' } = useParams();
  const { data: topics } = useQuery({
    queryKey: ['topics'],
    queryFn: learningAPI.listTopics,
  });

  console.log({
    topics,
  });
  const {
    data: lessons,
    isPending,
    error,
  } = useQuery({
    queryKey: ['lessons', topicId],
    queryFn: () => learningAPI.listLessons(topicId),
  });
  const topic = topics?.find((t) => t.id === topicId);
  const path = useQuery({ queryKey: ['learning-path'], queryFn: authAPI.learningPath, retry:false });
  if (isPending) return <Loading />;
  if (error || !lessons)
    return <ErrorState message="This topic could not be loaded." />;
  return (
    <>
      <BackLink to="/">All topics</BackLink>
      <p className="font-bold text-ocean">TOPIC</p>
      <h1 className="text-3xl font-bold">{topic?.title ?? 'Learning topic'}</h1>
      <p className="mt-2 max-w-2xl text-slate-600">{topic?.description}</p>
      <div className="my-7 grid gap-3 sm:grid-cols-2">
        <PrimaryLink to={`/topics/${topicId}/practice`}>
          Practice questions
        </PrimaryLink>
        <Link
          to={`/topics/${topicId}/quiz`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-ocean px-4 py-3 font-bold text-ocean hover:bg-sky"
        >
          <Play size={18} />
          Start a 5-question quiz
        </Link>
      </div>
      <h2 className="mb-3 text-xl font-bold">Lessons</h2>
      <ol className="space-y-3">
        {lessons.map((lesson, index) => (
          <li key={lesson.id}>
            <Link
              to={`/lessons/${lesson.id}`}
              className="flex items-center gap-4 rounded-2xl border bg-white p-4 hover:border-teal-300"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 font-bold text-slate-600">
                {index + 1}
              </span>
              <span className="font-semibold">{lesson.title}</span>
              <span className="ml-auto text-ocean">Read →</span>
            </Link>
          </li>
        ))}
      </ol>
      {lessons.length > 0 && lessons.every(lesson => path.data?.find(item => item.id === lesson.id)?.completed) && <section className="mt-7 rounded-2xl border-2 border-sun bg-yellow-50 p-5"><p className="font-bold text-ocean">TOPIC CHECKPOINT</p><h2 className="mt-1 text-xl font-bold">Ready to unlock the next topic?</h2><p className="mt-1 text-sm text-slate-600">Score at least 80%. You can retry if needed.</p><Link to={`/topics/${topicId}/checkpoint`} className="mt-4 inline-flex rounded-xl bg-ocean px-5 py-3 font-bold text-white">Start checkpoint</Link></section>}
    </>
  );
}

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const [lessonSearchParams] = useSearchParams();
  useEffect(() => {
    if (lessonId) void authAPI.startLesson(lessonId).catch(() => undefined);
  }, [lessonId]);
  const savedPosition = useQuery({
    queryKey: ['lesson-position', lessonId],
    queryFn: () => authAPI.lessonPosition(lessonId),
    retry: false,
    enabled: Boolean(lessonId),
  });
  useEffect(() => {
    const value = Number(savedPosition.data?.position);
    if (Number.isFinite(value) && value > 0)
      window.setTimeout(
        () => window.scrollTo({ top: value, behavior: 'auto' }),
        0,
      );
  }, [savedPosition.data]);
  useEffect(
    () => () => {
      if (lessonId)
        void authAPI
          .saveLessonPosition(lessonId, String(Math.round(window.scrollY)))
          .catch(() => undefined);
    },
    [lessonId],
  );
  const {
    data: lesson,
    isPending,
    error,
  } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => learningAPI.getLesson(lessonId),
  });
  const topicLessons = useQuery({
    queryKey: ['topic-lessons', lesson?.topicId],
    queryFn: () => learningAPI.listLessons(lesson!.topicId),
    enabled: Boolean(lesson?.topicId),
  });
  const topics = useQuery({ queryKey: ['topics'], queryFn: learningAPI.listTopics });
  const lessonQuestions = useQuery({
    queryKey: ['lesson-practice-questions', lessonId],
    queryFn: () => learningAPI.getLessonQuestions(lessonId),
    enabled: Boolean(lessonId),
  });
  const complete = useMutation({
    mutationFn: () => authAPI.completeLesson(lessonId),
  });
  if (isPending) return <Loading />;
  if (error || !lesson)
    return <ErrorState message="This lesson could not be loaded." />;
  const lessonIndex =
    topicLessons.data?.findIndex((item) => item.id === lesson.id) ?? -1;
  const previousLesson =
    lessonIndex > 0 ? topicLessons.data?.[lessonIndex - 1] : undefined;
  const nextLesson =
    lessonIndex >= 0 ? topicLessons.data?.[lessonIndex + 1] : undefined;
  return (
    <>
      <BackLink to={`/topics/${lesson.topicId}`}>Topic</BackLink>
      <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-10">
        <p className="font-bold text-ocean">LESSON</p>
        <h1 className="mb-6 mt-1 text-3xl font-bold">{lesson.title}</h1>
        <HighlightableLesson lessonId={lesson.id} focusID={lessonSearchParams.get('highlight') ?? undefined}>
          <LearnerMedia type="lesson" contentId={lesson.id} />
          <LessonRenderer
            document={lesson.document}
            fallbackMarkdown={lesson.content}
            lessonId={lesson.id}
          />
        </HighlightableLesson>
        <section className="mt-10 border-t pt-7" aria-labelledby="lesson-practice-heading">
          <p className="font-bold text-ocean">PUT IT INTO PRACTICE</p>
          <h2 id="lesson-practice-heading" className="mt-1 text-2xl font-bold">Lesson practice questions</h2>
          {lessonQuestions.isPending ? <p className="mt-3 text-sm text-slate-500">Loading practice questions…</p> : lessonQuestions.error ? <ErrorState message="Lesson practice could not be loaded." /> : <PracticeSession questions={lessonQuestions.data ?? []} storageKey={`lesson-practice:${lesson.id}`} heading={lesson.title} context={[topics.data?.find((item) => item.id === lesson.topicId)?.title ?? 'Topic', lesson.title, 'Practice']} inline />}
        </section>
        <div className="mt-8 flex flex-wrap gap-3 border-t pt-6">
          <button
            onClick={() => complete.mutate()}
            disabled={complete.isPending || Boolean(complete.data)}
            className="rounded-xl border border-ocean px-4 py-3 font-bold text-ocean"
          >
            {complete.data ? 'Lesson completed +10 XP' : 'Mark lesson complete'}
          </button>
        </div>
        {complete.error && (
          <p className="mt-3 text-sm text-slate-600">
            Sign in to save this lesson to your progress.
          </p>
        )}
        {(previousLesson || nextLesson) && (
          <nav
            aria-label="Lesson navigation"
            className="mt-6 flex justify-between gap-4 border-t pt-5"
          >
            {previousLesson ? (
              <Link
                className="font-bold text-ocean"
                to={`/lessons/${previousLesson.id}`}
              >
                ← Previous lesson
              </Link>
            ) : (
              <span />
            )}
            {nextLesson ? (
              <Link
                className="font-bold text-ocean"
                to={`/lessons/${nextLesson.id}`}
              >
                Next lesson →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </>
  );
}

export function PracticePage() {
  const { topicId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const lessonID = searchParams.get('lesson') ?? '';
  const {
    data: questions,
    isPending,
    error,
  } = useQuery({
    queryKey: ['questions', topicId, lessonID],
    queryFn: () => lessonID ? learningAPI.getLessonQuestions(lessonID) : learningAPI.getQuestions(topicId),
  });
  const topics = useQuery({ queryKey: ['topics'], queryFn: learningAPI.listTopics });
  const lessons = useQuery({ queryKey: ['lessons', topicId], queryFn: () => learningAPI.listLessons(topicId), enabled: Boolean(lessonID) });
  if (isPending) return <Loading />;
  if (error || !questions?.length)
    return <ErrorState message="Practice questions could not be loaded." />;
  const topicName = topics.data?.find((item) => item.id === topicId)?.title ?? 'Topic';
  const lessonName = lessons.data?.find((item) => item.id === lessonID)?.title;
  return (
    <>
      <BackLink to={lessonID ? `/lessons/${lessonID}` : `/topics/${topicId}`}>{lessonID ? 'Lesson' : 'Topic'}</BackLink>
      <PracticeSession questions={questions} storageKey={`practice:${lessonID || topicId}`} heading={lessonName ?? `${topicName} practice`} context={lessonName ? [topicName, lessonName, 'Practice'] : [topicName, 'Practice']} initialQuestionID={searchParams.get('question') ?? undefined} />
    </>
  );
}

function QuestionCard({ question, selected, onSelect }: {
  question: import('./api/types').QuestionView;
  selected?: string;
  onSelect: (id: string) => void;
}) {
  const signCodes = referencedTrafficSignCodes(question.text);
  return <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="mb-4 flex items-start justify-between gap-3"><RichTextContent value={question.text} /><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold uppercase text-slate-500">{question.difficulty}</span></div>{signCodes.length > 0 && <div className="mb-4 flex flex-wrap gap-3 rounded-xl bg-sky/40 p-3" aria-label="Traffic signs referenced in this question">{signCodes.map(code => <span key={code} className="flex items-center gap-2"><TrafficSign code={code} size="card"/><strong>{code}</strong></span>)}</div>}<LearnerMedia type="question" contentId={question.id} /><div className="mt-4 space-y-2">{question.options.map((option) => <button key={option.id} type="button" onClick={() => onSelect(option.id)} className={`w-full rounded-xl border p-3 text-left transition ${selected === option.id ? 'border-ocean bg-sky' : 'hover:border-teal-300'}`}>{option.text}</button>)}</div></div>;
}

export function StartQuizPage({checkpoint=false}:{checkpoint?:boolean}) {
  const { topicId = '' } = useParams();
  const navigate = useNavigate();
  const create = useMutation({
    mutationFn: () => checkpoint ? learningAPI.createCheckpoint(topicId) : learningAPI.createQuiz(topicId),
    onSuccess: (quiz) => {
      sessionStorage.setItem(quizKey(quiz.id), JSON.stringify(quiz));
      if (checkpoint) sessionStorage.setItem(`${quizKey(quiz.id)}.checkpoint`, 'true');
      navigate(`/quizzes/${quiz.id}`);
    },
  });
  return (
    <div className="mx-auto max-w-xl text-center">
      <Clock3 className="mx-auto text-ocean" size={42} />
      <h1 className="mt-4 text-3xl font-bold">{checkpoint?'Ready for your topic checkpoint?':'Ready for a focused quiz?'}</h1>
      <p className="mt-3 text-slate-600">
        You will answer five questions. {checkpoint?'Score 80% to unlock the next topic.':'Your score and rule explanations appear at the end.'}
      </p>
      <button
        className="mt-7 rounded-xl bg-ocean px-5 py-3 font-bold text-white disabled:opacity-50"
        disabled={create.isPending}
        onClick={() => create.mutate()}
      >
        {create.isPending ? 'Starting…' : checkpoint?'Start checkpoint':'Start quiz'}
      </button>
      {create.error && (
        <div className="mt-5">
          <ErrorState message={checkpoint && create.error instanceof APIError && create.error.status === 403 ? 'Finish every lesson in this topic before starting its checkpoint.' : create.error instanceof APIError ? create.error.message : 'The quiz could not be started. This topic needs at least five questions.'} />
        </div>
      )}
    </div>
  );
}

export function QuizPage() {
  const { quizId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const quiz = JSON.parse(
    sessionStorage.getItem(quizKey(quizId)) ?? 'null',
  ) as QuizView | null;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const submit = useMutation({
    mutationFn: () =>
      learningAPI.submitQuiz(
        quizId,
        Object.entries(answers).map(([questionId, answerId]) => ({
          questionId,
          answerId,
        })),
      ),
    onSuccess: (result) => {
      sessionStorage.setItem(resultKey(quizId), JSON.stringify(result));
      void queryClient.invalidateQueries({queryKey:['learning-path']});
      navigate(`/quizzes/${quizId}/results`);
    },
  });
  if (!quiz)
    return (
      <ErrorState message="This quiz is no longer in this browser. Start a new quiz from the topic page." />
    );
  const current = Object.keys(answers).length;
  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-bold text-ocean">QUIZ IN PROGRESS</p>
          <h1 className="text-2xl font-bold">
            {current} of {quiz.questions.length} answered
          </h1>
        </div>
        <span className="rounded-full bg-sky px-3 py-1 text-sm font-bold text-ocean">
          {Math.round((current / quiz.questions.length) * 100)}%
        </span>
      </div>
      <div className="space-y-5">
        {quiz.questions.map((question, i) => (
          <div key={question.id}>
            <p className="mb-2 text-sm font-bold text-slate-500">
              QUESTION {i + 1}
            </p>
            <QuestionCard
              question={question}
              selected={answers[question.id]}
              onSelect={(optionID) =>
                setAnswers({ ...answers, [question.id]: optionID })
              }
            />
          </div>
        ))}
      </div>
      <button
        className="mt-6 rounded-xl bg-ocean px-5 py-3 font-bold text-white disabled:opacity-50"
        disabled={current !== quiz.questions.length || submit.isPending}
        onClick={() => submit.mutate()}
      >
        {submit.isPending ? 'Submitting…' : 'Submit quiz'}
      </button>
      {submit.error && (
        <div className="mt-4">
          <ErrorState message="The quiz could not be submitted. It may have expired; start a new one." />
        </div>
      )}
    </>
  );
}

export function ResultsPage() {
  const { quizId = '' } = useParams();
  const result = JSON.parse(
    sessionStorage.getItem(resultKey(quizId)) ?? 'null',
  ) as QuizResult | null;
  if (!result) return <ErrorState message="No results found for this quiz." />;
  const passed = result.percentageScore >= 80;
  const checkpoint = sessionStorage.getItem(`${quizKey(quizId)}.checkpoint`) === 'true';
  return (
    <div className="mx-auto max-w-2xl">
      <section className="rounded-3xl bg-ink p-7 text-center text-white">
        <p className="font-bold text-sun">{checkpoint?'TOPIC CHECKPOINT COMPLETE':'QUIZ COMPLETE'}</p>
        <h1 className="mt-2 text-5xl font-bold">{result.percentageScore}%</h1>
        <p className="mt-2">
          {result.correctAnswers} correct · {result.incorrectAnswers} incorrect
        </p>
        <p className="mt-5 inline-block rounded-full bg-white/15 px-4 py-2 font-bold">
          +{result.xpEarned} XP earned
        </p>
        <p className="mt-5 text-slate-200">
          {passed
            ? checkpoint?'Checkpoint passed — the next topic is now unlocked.':'Strong work — keep that road awareness sharp.'
            : checkpoint?'Checkpoint not passed yet. Review the explanations and retry when ready.':'Good effort. Review the explanations, then try again.'}
        </p>
      </section>
      <section className="mt-6">
        <h2 className="mb-3 text-xl font-bold">Review your answers</h2>
        <div className="space-y-3">
          {result.feedback.map((item, i) => (
            <div
              key={item.questionId}
              className="rounded-2xl border bg-white p-4"
            >
              <p className="font-bold">
                Question {i + 1}{' '}
                {item.correct ? (
                  <CheckCircle2 className="inline text-ocean" size={18} />
                ) : (
                  <XCircle className="inline text-coral" size={18} />
                )}
              </p>
              {item.explanation && <RichTextContent value={item.explanation} />}
            </div>
          ))}
        </div>
      </section>
      <div className="mt-7">
        <PrimaryLink to="/">{checkpoint?'Return to roadmap':'Choose another topic'}</PrimaryLink>
      </div>
    </div>
  );
}
