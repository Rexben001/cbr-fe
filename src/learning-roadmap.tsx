import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { authAPI } from './api/auth';
import { ErrorState, Loading } from './components';
const stages = [
  ['Novice', '/'],
  ['Learn theory', '/'],
  ['Practise', '/practice/revision'],
  ['Review weak areas', '/practice/revision'],
  ['Mock exams', '/exams'],
  ['Exam ready', '/exams/history'],
];
export function LearningRoadmap() {
  const q = useQuery({
    queryKey: ['learning-path'],
    queryFn: authAPI.learningPath,
    retry: false,
  });
  if (q.isPending) return <Loading />;
  if (q.error || !q.data)
    return <ErrorState message="Roadmap could not be loaded." />;
  const done = q.data.filter((x) => x.completed).length;
  const current = q.data.find((x) => x.unlocked && !x.completed);
  const completion = q.data.length ? done / q.data.length : 0;
  const currentStage = done === 0 ? 0 : completion < .5 ? 1 : completion < 1 ? 2 : 3;
  return (
    <section className="mt-7 overflow-hidden rounded-3xl border bg-gradient-to-br from-sky via-white to-emerald-50 p-5">
      <p className="font-bold text-ocean">YOUR ROAD TO EXAM READY</p>
      <h2 className="mt-1 text-2xl font-bold">Learning roadmap</h2>
      <p className="mt-1 text-sm text-slate-600">
        {done}/{q.data.length} lessons completed. Preparation progress is not a
        pass guarantee.
      </p>
      <div className="relative mt-6 flex gap-3 overflow-x-auto pb-4 before:absolute before:left-8 before:right-8 before:top-6 before:h-2 before:rounded-full before:bg-slate-300">
        {stages.map(([label, to], index) => (
          <Link
            key={label}
            to={to}
            className={`relative min-w-36 rounded-2xl border p-3 pt-10 text-sm font-bold shadow-sm ${index === currentStage ? 'border-ocean bg-sun text-ink ring-4 ring-sky' : index < currentStage ? 'border-teal-500 bg-emerald-50 text-teal-900' : 'bg-white text-slate-600'}`}
          >
            <span className={`absolute left-4 top-3 grid h-7 w-7 place-items-center rounded-full text-xs ${index<=currentStage?'bg-ocean text-white':'bg-slate-200'}`}>{index + 1}</span>
            {label}
          </Link>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {q.data.slice(0, 6).map((item) => (
          <Link
            key={item.id}
            to={`/lessons/${item.id}`}
            className={`flex items-center justify-between rounded-xl p-3 ${item.completed ? 'bg-emerald-100' : item.id === current?.id ? 'bg-sky' : 'bg-white/70'}`}
          >
            <span>{item.title}</span>
            <strong>
              {item.completed
                ? 'Completed'
                : item.id === current?.id
                  ? 'Continue'
                  : 'Upcoming'}
            </strong>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function RoadmapPage(){return <div className="mx-auto max-w-5xl"><LearningRoadmap/></div>}
