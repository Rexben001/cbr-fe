import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, Flame, RotateCcw, Target, Trophy } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { authAPI } from './api/auth';
import { examsAPI, type ExamHistoryItem } from './api/exams';
import { learningAPI } from './api/learning';
import { ErrorState, Loading } from './components';

const statusLabel = (status: string) => status.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

export function LearnerDashboard() {
  const user = useQuery({ queryKey: ['me'], queryFn: authAPI.me, retry: false });
  const enabled = Boolean(user.data);
  const progress = useQuery({ queryKey: ['progress'], queryFn: authAPI.progress, enabled, retry: false });
  const practice = useQuery({ queryKey: ['practice-analytics'], queryFn: learningAPI.practiceAnalytics, enabled, retry: false });
  const path = useQuery({ queryKey: ['learning-path'], queryFn: authAPI.learningPath, enabled, retry: false });
  const topics = useQuery({ queryKey: ['topics'], queryFn: learningAPI.listTopics });
  const exams = useQuery({ queryKey: ['exam-history'], queryFn: examsAPI.history, enabled, retry: false });
  const examPerformance = useQuery({ queryKey: ['exam-performance'], queryFn: examsAPI.performance, enabled, retry: false });

  if (user.isPending) return <Loading />;
  if (user.error || !user.data) return <Navigate to="/login" replace />;
  if (progress.isPending || practice.isPending || path.isPending || exams.isPending) return <Loading />;
  if (progress.error || !progress.data || practice.error || !practice.data || path.error || !path.data) return <ErrorState message="Your dashboard could not be loaded." />;

  const completedLessons = path.data.filter((lesson) => lesson.completed).length;
  const lessonPercent = path.data.length ? Math.round(completedLessons / path.data.length * 100) : null;
  const nextLesson = path.data.find((lesson) => lesson.unlocked && !lesson.completed);
  const topicNames = new Map(topics.data?.map((topic) => [topic.id, topic.title]));
  const friendlyTopic = (id: string) => topicNames.get(id) ?? (/^m0?(\d+)$/i.test(id) ? `Topic ${Number(id.slice(1))}` : id);
  const recent = (exams.data ?? []).slice(0, 3);
  const activeExam = (exams.data ?? []).find((exam) => exam.status === 'in_progress');
  const weakTopic = practice.data.topics.filter((topic) => topic.attempts > 0).sort((a, b) => a.accuracy - b.accuracy)[0];

  const stages = ['Novice', 'Learn theory', 'Practise', 'Review weak areas', 'Mock exams', 'Exam ready'];
  let stageIndex = 0;
  if (completedLessons > 0) stageIndex = 1;
  if (lessonPercent === 100) stageIndex = 2;
  if (practice.data.totalAttempts > 0) stageIndex = practice.data.incorrectQuestions > 0 ? 3 : 4;
  if ((examPerformance.data?.totalCompleted ?? 0) > 0) stageIndex = 4;
  if ((examPerformance.data?.passed ?? 0) > 0 && lessonPercent === 100 && practice.data.totalAttempts > 0 && practice.data.overallAccuracy >= 80) stageIndex = 5;

  const recommendations: Array<{ title: string; detail: string; to: string }> = [];
  if (activeExam) recommendations.push({ title: 'Resume your mock exam', detail: 'Your timer and saved answers are preserved.', to: `/exams/${activeExam.id}` });
  if (nextLesson) recommendations.push({ title: `Continue ${nextLesson.title}`, detail: `Next lesson in ${friendlyTopic(nextLesson.topicId)}.`, to: `/lessons/${nextLesson.id}` });
  if (practice.data.incorrectQuestions > 0) recommendations.push({ title: 'Review your mistakes', detail: `${practice.data.incorrectQuestions} question${practice.data.incorrectQuestions === 1 ? '' : 's'} need another look.`, to: '/practice/revision' });
  if (weakTopic && recommendations.length < 3) recommendations.push({ title: `Practise ${friendlyTopic(weakTopic.topic)}`, detail: `${Math.round(weakTopic.accuracy)}% accuracy from ${weakTopic.attempts} attempts.`, to: `/topics/${weakTopic.topic}/practice` });
  if (!activeExam && (examPerformance.data?.totalCompleted ?? 0) === 0 && recommendations.length < 3) recommendations.push({ title: 'Try a mock exam', detail: 'Use it as practice after a focused study session.', to: '/exams' });

  return <div className="mx-auto max-w-6xl space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-4"><div><p className="text-sm font-bold text-ocean">LEARNER DASHBOARD</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Welcome back, {user.data.displayName}</h1></div><Link to="/" className="text-sm font-bold text-ocean">Browse learning →</Link></header>

    <section className="rounded-2xl bg-ink p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-5"><div><p className="text-sm font-bold text-sun">CONTINUE LEARNING</p><h2 className="mt-1 text-xl font-bold">{nextLesson?.title ?? 'Review your completed lessons'}</h2><p className="mt-1 text-sm text-slate-300">{nextLesson ? friendlyTopic(nextLesson.topicId) : 'Your curriculum is complete.'}</p></div><Link to={nextLesson ? `/lessons/${nextLesson.id}` : '/'} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sun px-5 py-3 font-bold text-ink sm:mt-0"><BookOpen size={18} />{nextLesson ? 'Continue learning' : 'Review lessons'} →</Link></section>

    <section className="grid gap-3 sm:grid-cols-3" aria-label="Primary progress metrics">
      <Metric icon={<CheckCircle2 />} label="Lessons completed" value={path.data.length ? `${completedLessons} of ${path.data.length}` : 'No lessons yet'} />
      <Metric icon={<Target />} label="Practice accuracy" value={practice.data.totalAttempts ? `${Math.round(practice.data.overallAccuracy)}%` : 'No attempts yet'} />
      <Metric icon={<RotateCcw />} label="Questions to review" value={practice.data.totalAttempts ? String(practice.data.incorrectQuestions) : 'None yet'} />
    </section>

    <section className="flex flex-wrap gap-x-7 gap-y-3 rounded-xl border bg-white px-4 py-3 text-sm"><span className="inline-flex items-center gap-2"><Trophy className="text-yellow-500" size={18} /><strong>{progress.data.totalXp} XP</strong></span><span>Level <strong>{progress.data.level.number}</strong></span><span className="inline-flex items-center gap-2"><Flame className="text-orange-500" size={18} /><strong>{progress.data.currentStreak}</strong> day streak</span><span className="text-slate-500">Best: {progress.data.longestStreak} days</span></section>

    <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-2xl border bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-ocean">CURRENT STAGE</p><h2 className="mt-1 text-xl font-bold">{stages[stageIndex]}</h2></div><Link to="/roadmap" className="text-sm font-bold text-ocean">Full roadmap →</Link></div>{lessonPercent === null ? <p className="mt-4 text-sm text-slate-600">No curriculum progress is available yet.</p> : <><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${lessonPercent}%` }} /></div><div className="mt-2 flex justify-between text-sm"><span>{lessonPercent}% lesson progress</span><span>Next: {stages[Math.min(stageIndex + 1, stages.length - 1)]}</span></div></>}</div>
      <div className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Recent activity</h2><div className="mt-3 divide-y">{recent.map((exam) => <Activity key={exam.id} exam={exam} />)}{recent.length === 0 && <p className="py-3 text-sm text-slate-600">No mock exam activity yet. Your completed lessons and practice will appear in their progress cards.</p>}</div>{recent.length > 0 && <Link to="/exams/history" className="mt-3 inline-block text-sm font-bold text-ocean">View exam history →</Link>}</div>
    </section>

    <section><div><p className="text-sm font-bold text-ocean">WHAT TO FOCUS ON</p><h2 className="text-xl font-bold">Recommended next steps</h2></div><div className="mt-3 grid gap-3 md:grid-cols-3">{recommendations.slice(0, 3).map((item) => <Link key={item.title} to={item.to} className="rounded-xl border bg-white p-4 shadow-sm hover:border-ocean"><strong>{item.title}</strong><p className="mt-1 text-sm text-slate-600">{item.detail}</p><span className="mt-3 block text-sm font-bold text-ocean">Open →</span></Link>)}{recommendations.length === 0 && <p className="rounded-xl bg-emerald-50 p-4 text-emerald-900">You are caught up. Review any lesson or practise a topic when you are ready.</p>}</div></section>
  </div>;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="rounded-xl border bg-white p-4 shadow-sm"><span className="text-ocean">{icon}</span><strong className="mt-2 block text-2xl">{value}</strong><span className="text-sm text-slate-600">{label}</span></div>; }
function Activity({ exam }: { exam: ExamHistoryItem }) { const result = exam.status === 'completed' ? `${Math.round(exam.percentage)}% · ${exam.passed ? 'Passed' : 'Not passed'}` : statusLabel(exam.status); return <Link to={exam.status === 'completed' ? `/exams/${exam.id}/results` : `/exams/${exam.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-ocean"><span><strong>Mock exam</strong><small className="mt-0.5 block text-slate-500">{new Date(exam.startedAt).toLocaleDateString()}</small></span><span className="font-semibold">{result}</span></Link>; }
