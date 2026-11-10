import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authAPI } from './api/auth';

export function LearningPath() {
  const { data, isPending } = useQuery({
    queryKey: ['learning-path'],
    queryFn: authAPI.learningPath,
  });
  if (isPending)
    return <p className="mt-6 text-slate-500">Loading learning path…</p>;
  return (
    <section className="mt-7">
      <h2 className="text-xl font-bold">Your learning path</h2>
      <div className="mt-3 space-y-2">
        {data?.map((lesson) =>
          lesson.unlocked ? (
            <Link
              key={lesson.id}
              to={`/lessons/${lesson.id}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-ocean"
            >
              <CheckCircle2
                className={lesson.completed ? 'text-ocean' : 'text-slate-300'}
                size={19}
              />
              <span>{lesson.title}</span>
              <span className="ml-auto text-sm text-ocean">
                {lesson.completed ? 'Review' : 'Start'}
              </span>
            </Link>
          ) : (
            <div
              key={lesson.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-500"
            >
              <LockKeyhole size={19} />
              <span>{lesson.title}</span>
              <span className="ml-auto text-xs">{lesson.lockedReason}</span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}
