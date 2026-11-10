import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { learningAPI } from './api/learning';
import type { EmbeddedLessonQuiz } from './api/types';
import { ErrorState, Loading } from './components';
import { MediaPreview } from './media';

export function EmbeddedLessonQuiz({ lessonId, quizId }: { lessonId: string; quizId: string }) {
  const query = useQuery({ queryKey: ['embedded-lesson-quiz', lessonId, quizId], queryFn: () => learningAPI.embeddedLessonQuiz(lessonId, quizId), retry: false });
  if (query.isPending) return <Loading />;
  if (query.error || !query.data) return <ErrorState message="This lesson quiz is unavailable." />;
  return <QuizPlayer quiz={query.data} />;
}

function QuizPlayer({ quiz }: { quiz: EmbeddedLessonQuiz }) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<Awaited<ReturnType<typeof learningAPI.submitEmbeddedLessonQuiz>>>();
  const submit = useMutation({ mutationFn: () => learningAPI.submitEmbeddedLessonQuiz(quiz.lessonId, quiz.id, quiz.questions.map(question => ({ questionId: question.id, answerIds: answers[question.id] ?? [] }))), onSuccess: setResult });
  const toggle = (question: EmbeddedLessonQuiz['questions'][number], optionID: string) => setAnswers(current => {
    const selected = current[question.id] ?? [];
    const next = question.type === 'single_select' ? [optionID] : selected.includes(optionID) ? selected.filter(id => id !== optionID) : [...selected, optionID];
    return { ...current, [question.id]: next };
  });
  const retry = () => { setAnswers({}); setResult(undefined); submit.reset(); };
  return <section className="my-7 rounded-2xl border-2 border-ocean/20 bg-sky/30 p-5" aria-label={`Lesson quiz: ${quiz.title}`}><p className="font-bold text-ocean">CHECK YOUR UNDERSTANDING</p><h2 className="mt-1 text-2xl font-bold">{quiz.title}</h2><div className="mt-5 space-y-6">{quiz.questions.map((question, index) => { const feedback = result?.feedback.find(item => item.questionId === question.id); return <fieldset key={question.id} disabled={Boolean(result)}><legend className="font-semibold">{index + 1}. {question.text}</legend>{question.mediaId && <QuizMedia id={question.mediaId} />}<div className="mt-3 space-y-2">{question.options.map(option => <label key={option.id} className="flex cursor-pointer gap-3 rounded-xl border bg-white p-3"><input type={question.type === 'multi_select' ? 'checkbox' : 'radio'} name={question.id} checked={(answers[question.id] ?? []).includes(option.id)} onChange={() => toggle(question, option.id)} /><span>{option.text}</span></label>)}</div>{feedback && <div className={`mt-3 rounded-xl p-3 ${feedback.correct ? 'bg-emerald-50 text-emerald-900' : 'bg-orange-50 text-orange-900'}`}><strong>{feedback.correct ? 'Correct' : 'Review this rule'}</strong><p className="mt-1">{feedback.explanation}</p></div>}</fieldset>; })}</div>{result ? <div className="mt-6 flex items-center justify-between rounded-xl bg-white p-4"><strong>{result.correctAnswers}/{result.totalQuestions} correct</strong><button type="button" className="admin-secondary-button" onClick={retry}>Retry quiz</button></div> : <button type="button" disabled={submit.isPending || quiz.questions.some(question => (answers[question.id] ?? []).length === 0)} onClick={() => submit.mutate()} className="mt-6 admin-primary-button">{submit.isPending ? 'Checking…' : 'Check answers'}</button>}{submit.error && <div className="mt-4"><ErrorState message="Quiz answers could not be checked. Try again." /></div>}</section>;
}

function QuizMedia({ id }: { id: string }) { const media = useQuery({ queryKey: ['media-access', id], queryFn: () => learningAPI.mediaAccess(id), retry: false }); return media.data ? <div className="mt-3 max-w-md"><MediaPreview asset={media.data.media} /></div> : null; }
