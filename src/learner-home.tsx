import { useQueries, useQuery } from '@tanstack/react-query';
import { BookOpen, CarFront, ClipboardCheck, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authAPI } from './api/auth';
import { learningAPI } from './api/learning';
import { ErrorState, Loading } from './components';
import { LearningSearch } from './learner-search';

export function LearnerHome() {
  const me = useQuery({ queryKey: ['me'], queryFn: authAPI.me, retry: false });
  const topics = useQuery({ queryKey: ['topics'], queryFn: learningAPI.listTopics });
  const path = useQuery({ queryKey: ['learning-path'], queryFn: authAPI.learningPath, enabled: Boolean(me.data), retry: false });
  const lessonQueries = useQueries({ queries: (topics.data ?? []).map((topic) => ({ queryKey: ['lessons', topic.id], queryFn: () => learningAPI.listLessons(topic.id) })) });
  if (topics.isPending) return <Loading />;
  if (topics.error || !topics.data) return <ErrorState message="Learning content could not be loaded." />;

  const next = path.data?.find((item) => item.unlocked && !item.completed);
  const completed = new Set(path.data?.filter((item) => item.completed).map((item) => item.id));
  const continueTo = next ? `/lessons/${next.id}` : me.data ? '/dashboard' : `/topics/${topics.data[0]?.id ?? ''}`;

  return <div className="space-y-7">
    <section className="rounded-2xl bg-ink px-5 py-5 text-white shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-7">
      <div><p className="text-sm font-bold text-sun">WELCOME TO RIJFIKS</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">{me.data ? `Welcome back, ${me.data.displayName}` : 'Learn Dutch driving theory'}</h1>{next && <p className="mt-1 text-sm text-slate-300">Current lesson: <strong className="text-white">{next.title}</strong></p>}</div>
      <Link to={continueTo} className="mt-4 inline-flex shrink-0 items-center gap-2 rounded-xl bg-sun px-5 py-3 font-bold text-ink sm:mt-0"><BookOpen size={19} />{next ? 'Continue learning' : 'Start learning'} →</Link>
    </section>

    <section className="rounded-2xl border border-sky bg-sky/50 p-4 sm:p-5" aria-labelledby="home-search-title"><p className="text-sm font-bold text-ocean">FIND LEARNING CONTENT</p><h2 id="home-search-title" className="mb-3 text-xl font-bold">Search topics and lessons</h2><LearningSearch compact /></section>

    <section aria-labelledby="quick-access-title"><h2 id="quick-access-title" className="text-xl font-bold">Quick access</h2><div className="mt-3 grid gap-3 sm:grid-cols-3">
      {[[CarFront, 'Scenarios', '/scenarios'], [Target, 'Review mistakes', '/practice/revision'], [ClipboardCheck, 'Mock exam', '/exams']].map(([Icon, label, to]) => <Link key={String(label)} to={String(to)} className="flex items-center gap-3 rounded-xl border bg-white p-4 font-bold shadow-sm hover:border-ocean"><Icon className="text-ocean" size={22} />{String(label)}<span className="ml-auto text-ocean">→</span></Link>)}
    </div></section>

    <section aria-labelledby="explore-topics-title"><div className="mb-3"><p className="text-sm font-bold text-ocean">CURRICULUM</p><h2 id="explore-topics-title" className="text-2xl font-bold">Explore topics</h2></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {topics.data.map((topic, index) => { const lessons = lessonQueries[index]?.data ?? []; const done = lessons.filter((lesson) => completed.has(lesson.id)).length; const percent = lessons.length ? Math.round(done / lessons.length * 100) : 0; return <Link key={topic.id} to={`/topics/${topic.id}`} className="group rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ocean font-bold text-white">{index + 1}</span><div className="min-w-0 flex-1"><h3 className="font-bold leading-tight">{topic.title}</h3><p className="mt-1 text-sm text-slate-500">{lessons.length} lesson{lessons.length === 1 ? '' : 's'}</p></div><strong className="text-sm text-ocean">{percent}%</strong></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-label={`${percent}% complete`}><div className="h-full rounded-full bg-teal-500" style={{ width: `${percent}%` }} /></div><p className="mt-2 text-xs text-slate-500">{done} of {lessons.length} completed</p></Link>; })}
    </div></section>
  </div>;
}
