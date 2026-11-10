import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { learningAPI } from './api/learning';
import { ErrorState, Loading } from './components';

function QuestionList({
  title,
  items,
}: {
  title: string;
  items: Awaited<ReturnType<typeof learningAPI.revision>>;
}) {
  return (
    <section className="mt-7">
      <h2 className="text-xl font-bold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 rounded-xl bg-slate-100 p-4 text-slate-600">
          Nothing here yet.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <Link
              key={item.questionId}
              to={`/topics/${item.topic}/practice?question=${item.questionId}`}
              className="block rounded-xl border bg-white p-4 hover:border-ocean"
            >
              <strong>{item.questionText}</strong>
              <p className="mt-1 text-sm text-slate-600">
                {item.topic} ·{' '}
                {item.incorrectAttempts
                  ? `${item.incorrectAttempts} incorrect attempt${item.incorrectAttempts === 1 ? '' : 's'}`
                  : 'Saved question'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
export function PracticeProgressPage({
  mode,
}: {
  mode: 'revision' | 'bookmarks';
}) {
  const items = useQuery({
    queryKey: [mode],
    queryFn: () =>
      mode === 'revision' ? learningAPI.revision() : learningAPI.bookmarks(),
  });
  if (items.isPending) return <Loading />;
  if (items.error || !items.data)
    return <ErrorState message="Practice progress could not be loaded." />;
  return (
    <div>
      <p className="font-bold text-ocean">PRACTICE PROGRESS</p>
      <h1 className="mt-1 text-3xl font-bold">
        {mode === 'revision' ? 'Review mistakes' : 'Bookmarked questions'}
      </h1>
      <QuestionList
        title={mode === 'revision' ? 'Questions to retry' : 'Saved for later'}
        items={items.data}
      />
    </div>
  );
}
export function PracticeAnalyticsCard() {
  const q = useQuery({
    queryKey: ['practice-analytics'],
    queryFn: learningAPI.practiceAnalytics,
    retry: false,
  });
  if (!q.data) return null;
  return (
    <section className="mt-7 rounded-2xl border bg-white p-5">
      <h2 className="text-xl font-bold">Practice performance</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <span>{q.data.totalAttempts} attempts</span>
        <span>{Math.round(q.data.overallAccuracy)}% accuracy</span>
        <span>{q.data.incorrectQuestions} to review</span>
        <span>{q.data.distinctQuestions} unique questions</span>
      </div>
      <div className="mt-4 flex gap-3">
        <Link className="font-bold text-ocean" to="/practice/revision">
          Review mistakes →
        </Link>
        <Link className="font-bold text-ocean" to="/practice/bookmarks">
          Bookmarks →
        </Link>
      </div>
    </section>
  );
}
