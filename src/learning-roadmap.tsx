import { useQueries, useQuery } from '@tanstack/react-query';
import { BookOpen, Check, ChevronRight, Flag, Lock, Play, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import { authAPI } from './api/auth';
import { learningAPI } from './api/learning';
import { ErrorState, Loading } from './components';
import { LearningSearch } from './learner-search';
import './learning-roadmap.css';

type Topic = { id: string; title: string };
type Lesson = { id: string; title: string };
type Stop = {
  topic: Topic;
  lessons: Lesson[];
  done: number;
  status: 'complete' | 'current' | 'available' | 'locked';
  index: number;
};

const STAGE_HEIGHT = 208;
const ICONS = ['🚗', '🚦', '🛣️', '🚸', '🚲', '🌿', '⚠️', '📚'];

// A single fixed viewBox is shared by the scenery, road and markers.
const stopX = (i: number) => i % 2 === 0 ? 540 : 460;
const stopY = (i: number) => i * STAGE_HEIGHT + STAGE_HEIGHT / 2;

function roadPath(count: number): string {
  if (!count) return '';
  let d = `M ${stopX(0)} 0 L ${stopX(0)} ${stopY(0)}`;
  for (let i = 1; i < count; i++) {
    const previous = stopY(i - 1);
    const next = stopY(i);
    d += ` C ${stopX(i - 1) + (i % 2 ? -150 : 150)} ${previous + 68}, ${stopX(i) + (i % 2 ? 150 : -150)} ${next - 68}, ${stopX(i)} ${next}`;
  }
  return `${d} L ${stopX(count - 1)} ${count * STAGE_HEIGHT}`;
}

function Windmill({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-22 36 L-14 -22 L14 -22 L22 36 Z" fill="#f7e5bb" stroke="#9f7c4d" strokeWidth="3" />
    <path d="M-16 -22 L0 -47 L16 -22 Z" fill="#a34f40" />
    <rect x="-6" y="12" width="12" height="24" rx="3" fill="#88674c" />
    <g transform="translate(0,-15)" fill="#ecf4df" stroke="#8b6845" strokeWidth="3">
      <path d="M-5 -65 L5 -65 L4 65 L-4 65 Z" />
      <path d="M-65 -5 L65 -5 L65 5 L-65 5 Z" />
    </g>
    <circle cy="-15" r="7" fill="#a16e3a" />
  </g>;
}

function House({ x, y, tint = '#f1b28f', scale = 1 }: { x: number; y: number; tint?: string; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <rect x="-26" y="-21" width="52" height="55" rx="3" fill={tint} stroke="#fff8e7" strokeWidth="3" />
    <path d="M-34 -22 L0 -53 L34 -22 Z" fill="#bd6d59" stroke="#fff8e7" strokeWidth="3" />
    <rect x="-17" y="-10" width="12" height="15" fill="#bde7ee" stroke="#fff" strokeWidth="2" />
    <rect x="7" y="-10" width="12" height="15" fill="#bde7ee" stroke="#fff" strokeWidth="2" />
    <rect x="-7" y="15" width="14" height="19" rx="2" fill="#6c6c5e" />
  </g>;
}

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cy="14" rx="34" ry="9" fill="#7cbd7490" />
    <rect x="-5" y="-38" width="10" height="52" rx="3" fill="#997651" />
    <circle cx="-18" cy="-45" r="24" fill="#4cae65" />
    <circle cx="17" cy="-49" r="27" fill="#67bd67" />
    <circle cx="0" cy="-67" r="26" fill="#82ca70" />
  </g>;
}

function Landscape({ stops, currentIndex }: { stops: Stop[]; currentIndex: number }) {
  const count = stops.length;
  const h = Math.max(1, count) * STAGE_HEIGHT;
  const entire = roadPath(count);
  const active = currentIndex < 0 ? count - 1 : currentIndex;
  const done = roadPath(active + 1);
  const carY = count ? stopY(active) : 0;
  const carX = count ? stopX(active) : 500;

  return <div className="rf2-art" aria-hidden="true">
    <svg viewBox={`0 0 1000 ${h}`} preserveAspectRatio="none" className="rf2-map" role="presentation">
      <defs>
        <linearGradient id="rf2-earth" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#dff4fc" /><stop offset=".4" stopColor="#edf8df" /><stop offset="1" stopColor="#d8efc9" /></linearGradient>
        <linearGradient id="rf2-water" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8edbe5" /><stop offset="1" stopColor="#5ab8d2" /></linearGradient>
        <pattern id="rf2-grass" width="90" height="90" patternUnits="userSpaceOnUse"><path d="M22 71 l-4 -7 M22 71 l5 -8 M66 30 l-4 -6 M66 30 l5 -7" stroke="#77b968" strokeWidth="1.6" opacity=".45" fill="none" /></pattern>
      </defs>
      <rect width="1000" height={h} fill="url(#rf2-earth)" />
      <rect width="1000" height={h} fill="url(#rf2-grass)" />
      <path d={`M -80 ${h * .24} C 120 ${h * .21} 210 ${h * .3} 350 ${h * .285} C 500 ${h * .27} 690 ${h * .35} 1080 ${h * .29}`} fill="none" stroke="url(#rf2-water)" strokeWidth="58" opacity=".65" />
      <path d={`M -80 ${h * .24} C 120 ${h * .21} 210 ${h * .3} 350 ${h * .285} C 500 ${h * .27} 690 ${h * .35} 1080 ${h * .29}`} fill="none" stroke="#d6f8fa" strokeWidth="3" opacity=".75" />
      <path d={`M 0 ${h * .77} Q 200 ${h * .75} 355 ${h * .8} T 1000 ${h * .75}`} fill="none" stroke="#f5a8a1" strokeWidth="24" opacity=".65" strokeDasharray="12 9" />
      {Array.from({ length: count }, (_, i) => <g key={i}>
        <ellipse cx={i % 2 ? 190 : 820} cy={stopY(i) + 60} rx="170" ry="90" fill={i % 2 ? '#c7e6b6' : '#c1e9b7'} opacity=".65" />
        <Tree x={i % 2 ? 75 : 875} y={stopY(i) + 82} s={.65} />
        <Tree x={i % 2 ? 870 : 100} y={stopY(i) - 74} s={.55} />
        {i % 3 === 0 && <House x={i % 2 ? 800 : 130} y={stopY(i) + 65} tint={i % 2 ? '#e8c18b' : '#f2b0a1'} scale={.85} />}
        {i % 4 === 2 && <Windmill x={i % 2 ? 120 : 850} y={stopY(i) + 75} scale={.6} />}
        {i % 3 === 1 && <g fill="#f8b948">{[0, 1, 2, 3, 4].map(n => <circle key={n} cx={(i % 2 ? 105 : 840) + n * 17} cy={stopY(i) + 65 + (n % 2) * 8} r="5" />)}</g>}
      </g>)}
      <path d={entire} fill="none" stroke="#f8fcf4" strokeWidth="62" strokeLinecap="round" strokeLinejoin="round" />
      <path d={entire} fill="none" stroke="#657985" strokeWidth="53" strokeLinecap="round" strokeLinejoin="round" />
      <path d={done} fill="none" stroke="#eacb49" strokeWidth="53" strokeLinecap="round" strokeLinejoin="round" />
      <path d={entire} fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="12 17" strokeLinecap="round" />
      {stops.map(s => <g key={s.topic.id}>
        <circle cx={stopX(s.index)} cy={stopY(s.index)} r="30" fill={s.status === 'complete' ? '#099881' : s.status === 'current' ? '#ffd23c' : '#f4f8f6'} stroke="#fff" strokeWidth="6" />
        <text x={stopX(s.index)} y={stopY(s.index) + 7} textAnchor="middle" fontSize="24" fontWeight="800" fill="#173b56">{s.index + 1}</text>
      </g>)}
      {count > 0 && <g transform={`translate(${carX} ${carY - 47})`}>
        <ellipse cy="30" rx="24" ry="9" fill="#142c4250" />
        <rect x="-22" y="-16" width="44" height="42" rx="12" fill="#ffd326" stroke="#fff" strokeWidth="4" />
        <rect x="-15" y="-11" width="30" height="14" rx="5" fill="#83d2e8" />
        <rect x="-17" y="18" width="9" height="5" rx="2" fill="#e8f7ff" />
        <rect x="8" y="18" width="9" height="5" rx="2" fill="#e8f7ff" />
      </g>}
    </svg>
  </div>;
}

function Milestone({ item, activeLessonId }: { item: Stop; activeLessonId?: string }) {
  const isLocked = item.status === 'locked';
  const activeLesson = item.lessons.find(lesson => lesson.id === activeLessonId);
  const card = <>
    <div className="rf2-icon">{ICONS[item.index % ICONS.length]}</div>
    <div className="rf2-card-copy"><strong>{item.topic.title}</strong><span>{item.done} / {item.lessons.length} lessons</span></div>
    <span className="rf2-status">{item.status === 'complete' ? <Check size={18} /> : isLocked ? <Lock size={17} /> : <ChevronRight size={18} />}</span>
  </>;
  return <div className={`rf2-stage rf2-stage-${item.index % 2 === 0 ? 'left' : 'right'}`}>
    <div className={`rf2-node rf2-${item.status}`}>
      {isLocked ? <div className="rf2-card" aria-label={`${item.topic.title}, locked`}>{card}</div> : <Link to={`/topics/${item.topic.id}`} className="rf2-card">{card}</Link>}
      {item.status === 'current' && activeLesson && <Link to={`/lessons/${activeLesson.id}`} className="rf2-current-lesson"><Play size={13} /> Continue lesson</Link>}
    </div>
  </div>;
}

export function LearningRoadmap() {
  const path = useQuery({ queryKey: ['learning-path'], queryFn: authAPI.learningPath, retry: false });
  const topics = useQuery({ queryKey: ['topics'], queryFn: learningAPI.listTopics });
  const lessonQueries = useQueries({ queries: (topics.data ?? []).map(topic => ({ queryKey: ['lessons', topic.id], queryFn: () => learningAPI.listLessons(topic.id) })) });
  const journeyRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const journey = journeyRef.current;
    const current = journey?.querySelector<HTMLElement>('.rf2-current');
    if (journey && current && window.matchMedia('(min-width: 681px)').matches)
      journey.scrollTo({ top: Math.max(0, current.offsetTop - 28), behavior: 'smooth' });
  }, [path.data]);
  if (path.isPending || topics.isPending || lessonQueries.some(q => q.isPending)) return <Loading />;
  if (path.error || !path.data || topics.error || !topics.data || lessonQueries.some(q => q.error)) return <ErrorState message="Roadmap could not be loaded." />;
  const progress = new Map(path.data.map(item => [item.id, item]));
  const stages = topics.data.map((topic, i) => {
    const lessons = lessonQueries[i]?.data ?? [];
    const states = lessons.map(l => progress.get(l.id));
    return { topic, lessons, done: states.filter(s => s?.completed).length, complete: lessons.length > 0 && states.every(s => s?.completed), unlocked: states.some(s => s?.unlocked) };
  }).filter(stage => stage.lessons.length > 0);
  const currentIndex = stages.findIndex(s => s.unlocked && !s.complete);
  const milestones: Stop[] = stages.map((s, index) => ({ topic: s.topic, lessons: s.lessons, done: s.done, index, status: s.complete ? 'complete' : index === currentIndex ? 'current' : s.unlocked ? 'available' : 'locked' }));
  const completed = path.data.filter(item => item.completed).length;
  const percent = path.data.length ? Math.round(completed / path.data.length * 100) : 0;
  const currentLesson = path.data.find(item => item.unlocked && !item.completed);
  return <main className="mx-auto max-w-7xl rf2-shell">
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div><p className="font-bold text-ocean">YOUR ROUTE TO THE CBR THEORY EXAM</p><h1 className="mt-1 text-3xl font-bold">Learning roadmap</h1></div>
      <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-bold text-ocean"><Trophy size={18} />{completed} lessons completed</Link>
    </header>
    <div className="rf2-layout">
      <section ref={journeyRef} className="rf2-landscape" aria-label="Learning roadmap journey. Scroll to explore all topics." tabIndex={0}>
        {milestones.length ? <div className="rf2-journey" style={{ '--rf2-height': `${milestones.length * STAGE_HEIGHT}px` } as CSSProperties}>
          <Landscape stops={milestones} currentIndex={currentIndex} />
          <div className="rf2-stages">{milestones.map(m => <Milestone key={m.topic.id} item={m} activeLessonId={currentLesson?.id} />)}</div>
        </div> : <p className="p-8">No published lessons are available yet.</p>}
        <Link to="/exams" className="rf2-finish"><Flag size={22} /><span><strong>CBR practice exam</strong><small>Put your knowledge to the test</small></span><ChevronRight size={19} /></Link>
      </section>
      <aside className="rf2-sidebar">
        <section className="rf2-panel"><h2>Your progress</h2><div className="rf2-progress"><div className="rf2-ring" style={{ background: `conic-gradient(#13ae98 ${percent}%,#d9eaea 0)` }}><span>{percent}%</span></div><p><strong>{completed} of {path.data.length}</strong><small> lessons completed</small></p></div></section>
        {/* <section className="rf2-panel"><p className="rf2-eyebrow">NEXT STEP</p><h2>{currentLesson?.title ?? 'You completed the route!'}</h2><p className="rf2-muted">{currentTopic?.topic.title ?? 'Try a mock exam to keep practising.'}</p><Link to={currentLesson?`/lessons/${currentLesson.id}`:'/exams'} className="rf2-button"><Play size={16}/> {currentLesson?'Continue learning':'Open practice exams'}</Link></section> */}
        <section className="rf2-panel rf2-links"><Link to="/practice/revision">Review mistakes <ChevronRight size={17} /></Link></section>
        <section className="rf2-panel rf2-finder"><div><p className="rf2-eyebrow">QUICK FIND</p><h2>Find a lesson</h2><p className="rf2-muted">Search by lesson name or topic. Results open directly in your learning route.</p></div><LearningSearch compact /><Link to="/search" className="rf2-browse-link"><BookOpen size={16} /> Browse all learning content <ChevronRight size={16} /></Link></section>
      </aside>
    </div>
  </main>;
}
export function RoadmapPage() { return <LearningRoadmap />; }
