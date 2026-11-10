import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Play, Sparkles, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { learningAPI } from './api/learning';
import { authAPI } from './api/auth';
import type { QuestionView, QuizResult, QuizView } from './api/types';
import { BackLink, ErrorState, Loading, PrimaryLink } from './components';
import { LessonRenderer } from './lesson-blocks';
import { LearnerMedia } from './media';
import { RichTextContent } from './rich-text';

const quizKey = (id: string) => `roadready.quiz.${id}`;
const resultKey = (id: string) => `roadready.result.${id}`;

export function Dashboard() {
  const me = useQuery({ queryKey: ['me'], queryFn: authAPI.me, retry: false });

  const {
    data: topics,
    isPending,
    error,
  } = useQuery({ queryKey: ['topics'], queryFn: learningAPI.listTopics });
  if (isPending) return <Loading />;
  if (error)
    return (
      <ErrorState message="Topics could not be loaded. Is the Go API running?" />
    );
  return (
    <>
      <section className="mb-9 rounded-3xl bg-ink p-7 text-white shadow-sm sm:p-10">
        <p className="mb-2 font-bold text-sun">CATEGORY B THEORY</p>
        <h1 className="max-w-xl text-3xl font-bold sm:text-5xl">
          Build calm, confident road judgement.
        </h1>
        <p className="mt-4 max-w-xl text-slate-200">
          Short lessons. Clear Dutch road rules. Practical questions when you
          are ready.
        </p>
        <div className="mt-6 h-2 max-w-md overflow-hidden rounded-full bg-white/20">
          <div className="h-full w-1/12 rounded-full bg-sun" />
        </div>
        <p className="mt-2 text-sm text-slate-300">
          Your learning path starts here
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/scenarios"
            className="inline-block rounded-xl bg-sun px-4 py-3 font-bold text-ink"
          >
            Play driving scenarios →
          </Link>
          {!me.data?.email && (
            <Link
              to="/register"
              className="inline-block rounded-xl border border-white/50 px-4 py-3 font-bold text-white hover:bg-white/10"
            >
              Create free account
            </Link>
          )}
        </div>
      </section>
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="font-bold text-ocean">LEARNING PATH</p>
            <h2 className="text-2xl font-bold">Choose a topic</h2>
          </div>
          <span className="rounded-full bg-sky px-3 py-1 text-sm font-semibold text-ocean">
            {topics.length} topics
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {topics.map((topic, i) => (
            <Link
              key={topic.id}
              to={`/topics/${topic.id}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
            >
              <div className="flex justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky font-bold text-ocean">
                  {i + 1}
                </span>
                <Sparkles className="text-sun" />
              </div>
              <h3 className="mt-5 text-xl font-bold">{topic.title}</h3>
              <p className="mt-2 text-slate-600">{topic.description}</p>
              <p className="mt-5 font-semibold text-ocean">Explore topic →</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
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
    </>
  );
}

export function LessonPage() {
  const { lessonId = '' } = useParams();
  useEffect(() => {
    if (lessonId) void authAPI.startLesson(lessonId).catch(() => undefined);
  }, [lessonId]);
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
        <LearnerMedia type="lesson" contentId={lesson.id} />
        <LessonRenderer
          document={lesson.document}
          fallbackMarkdown={lesson.content}
          lessonId={lesson.id}
        />
        <div className="mt-8 flex flex-wrap gap-3 border-t pt-6">
          <PrimaryLink to={`/topics/${lesson.topicId}/practice`}>
            Practice this topic
          </PrimaryLink>
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

function QuestionCard({
  question,
  selected,
  onSelect,
  result,
}: {
  question: QuestionView;
  selected?: string | string[];
  onSelect: (id: string) => void;
  result?: { correct: boolean; explanation: string };
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex justify-between gap-3">
        <RichTextContent value={question.text} />
        <span className="h-fit rounded-full bg-slate-100 px-2 py-1 text-xs font-bold uppercase text-slate-500">
          {question.difficulty}
        </span>
      </div>
      <LearnerMedia type="question" contentId={question.id} />
      <div className="space-y-2">
        {question.options.map((option) => (
          <button
            key={option.id}
            disabled={Boolean(result)}
            onClick={() => onSelect(option.id)}
            className={`w-full rounded-xl border p-3 text-left transition ${(Array.isArray(selected) ? selected.includes(option.id) : selected === option.id) ? 'border-ocean bg-sky' : 'hover:border-teal-300'} ${result ? 'cursor-default' : ''}`}
          >
            {option.text}
          </button>
        ))}
      </div>
      {result && (
        <div
          className={`mt-4 rounded-xl p-3 ${result.correct ? 'bg-teal-50 text-teal-900' : 'bg-orange-50 text-orange-900'}`}
        >
          <strong>{result.correct ? 'Correct — +10 XP' : 'Not quite'}</strong>
          <RichTextContent value={result.explanation} />
        </div>
      )}
    </div>
  );
}

export function PracticePage() {
  const { topicId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const {
    data: questions,
    isPending,
    error,
  } = useQuery({
    queryKey: ['questions', topicId],
    queryFn: () => learningAPI.getQuestions(topicId),
  });
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [reportDescription, setReportDescription] = useState('');
  const answer = useMutation({
    mutationFn: () => learningAPI.answer(questions![index].id, selected),
  });
  useEffect(() => {
    const id = searchParams.get('question');
    const found = questions?.findIndex((question) => question.id === id) ?? -1;
    if (found >= 0) setIndex(found);
  }, [questions, searchParams]);
  const bookmark = useMutation({
    mutationFn: () => learningAPI.toggleBookmark(questions![index].id),
  });
  const report = useMutation({
    mutationFn: () =>
      learningAPI.reportQuestion(
        questions![index].id,
        'other',
        reportDescription,
      ),
    onSuccess: () => setReportDescription(''),
  });
  if (isPending) return <Loading />;
  if (error || !questions?.length)
    return <ErrorState message="Practice questions could not be loaded." />;
  const question = questions[index];
  return (
    <>
      <BackLink to={`/topics/${topicId}`}>Topic</BackLink>
      <div className="mb-4 flex justify-between">
        <div>
          <p className="font-bold text-ocean">PRACTICE</p>
          <h1 className="text-2xl font-bold">
            Question {index + 1} of {questions.length}
          </h1>
        </div>
        <span className="text-slate-500">
          {Math.round((index / questions.length) * 100)}%
        </span>
      </div>
      <QuestionCard
        question={question}
        selected={selected}
        onSelect={(id) =>
          setSelected((current) =>
            question.type === 'multiple_choice'
              ? current.includes(id)
                ? current.filter((value) => value !== id)
                : [...current, id]
              : [id],
          )
        }
        result={answer.data}
      />
      <div className="mt-5 flex justify-between">
        <button
          className="rounded-xl bg-ocean px-4 py-3 font-bold text-white disabled:opacity-50"
          disabled={
            !selected.length || answer.isPending || Boolean(answer.data)
          }
          onClick={() => answer.mutate()}
        >
          Check answer
        </button>
        {answer.data && (
          <button
            className="rounded-xl border border-ocean px-4 py-3 font-bold text-ocean"
            onClick={() => {
              setIndex((index + 1) % questions.length);
              setSelected([]);
              answer.reset();
            }}
          >
            Next question
          </button>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-3 border-t pt-4">
        <button
          type="button"
          className="font-bold text-ocean"
          onClick={() => bookmark.mutate()}
        >
          {bookmark.data?.bookmarked ? 'Bookmarked' : 'Bookmark question'}
        </button>
        <details className="text-sm">
          <summary className="cursor-pointer font-bold text-slate-600">
            Report a problem
          </summary>
          <div className="mt-2 flex gap-2">
            <input
              className="admin-field mt-0"
              value={reportDescription}
              onChange={(event) => setReportDescription(event.target.value)}
              placeholder="Describe the issue"
            />
            <button
              type="button"
              disabled={!reportDescription.trim() || report.isPending}
              className="admin-secondary-button"
              onClick={() => report.mutate()}
            >
              Send report
            </button>
          </div>
          {report.isSuccess && (
            <p className="mt-2 text-teal-700">Report sent.</p>
          )}
        </details>
      </div>
      {answer.error && (
        <ErrorState message="Your answer could not be checked. Try again." />
      )}
    </>
  );
}

export function StartQuizPage() {
  const { topicId = '' } = useParams();
  const navigate = useNavigate();
  const create = useMutation({
    mutationFn: () => learningAPI.createQuiz(topicId),
    onSuccess: (quiz) => {
      sessionStorage.setItem(quizKey(quiz.id), JSON.stringify(quiz));
      navigate(`/quizzes/${quiz.id}`);
    },
  });
  return (
    <div className="mx-auto max-w-xl text-center">
      <Clock3 className="mx-auto text-ocean" size={42} />
      <h1 className="mt-4 text-3xl font-bold">Ready for a focused quiz?</h1>
      <p className="mt-3 text-slate-600">
        You will answer five questions. Your score and rule explanations appear
        at the end.
      </p>
      <button
        className="mt-7 rounded-xl bg-ocean px-5 py-3 font-bold text-white disabled:opacity-50"
        disabled={create.isPending}
        onClick={() => create.mutate()}
      >
        {create.isPending ? 'Starting…' : 'Start quiz'}
      </button>
      {create.error && (
        <div className="mt-5">
          <ErrorState message="The quiz could not be started. This topic needs at least five questions." />
        </div>
      )}
    </div>
  );
}

export function QuizPage() {
  const { quizId = '' } = useParams();
  const navigate = useNavigate();
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
  return (
    <div className="mx-auto max-w-2xl">
      <section className="rounded-3xl bg-ink p-7 text-center text-white">
        <p className="font-bold text-sun">QUIZ COMPLETE</p>
        <h1 className="mt-2 text-5xl font-bold">{result.percentageScore}%</h1>
        <p className="mt-2">
          {result.correctAnswers} correct · {result.incorrectAnswers} incorrect
        </p>
        <p className="mt-5 inline-block rounded-full bg-white/15 px-4 py-2 font-bold">
          +{result.xpEarned} XP earned
        </p>
        <p className="mt-5 text-slate-200">
          {passed
            ? 'Strong work — keep that road awareness sharp.'
            : 'Good effort. Review the explanations, then try again.'}
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
        <PrimaryLink to="/">Choose another topic</PrimaryLink>
      </div>
    </div>
  );
}

// TODO: Use this api to get info about cbr location and driving instructors: https://www.rijscholenvergelijken.nl/api/ai/search?city=rotterdam&license=B&limit=5
