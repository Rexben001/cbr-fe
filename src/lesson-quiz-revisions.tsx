import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminAPI, type AdminLessonQuiz } from './api/admin';
import { ErrorState, Loading } from './components';
export function LessonQuizRevisions({
  quizId,
  onRestored,
}: {
  quizId: string;
  onRestored?: (quiz: AdminLessonQuiz) => void;
}) {
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ['lesson-quiz-revisions', quizId],
    queryFn: () => adminAPI.lessonQuizRevisions(quizId),
    enabled: Boolean(quizId),
  });
  const restore = useMutation({
    mutationFn: (version: number) =>
      adminAPI.restoreLessonQuiz(quizId, version),
    onSuccess: (quiz) => {
      client.invalidateQueries({ queryKey: ['lesson-quiz-revisions', quizId] });
      onRestored?.(quiz);
    },
  });
  if (q.isPending) return <Loading />;
  if (q.error || !q.data)
    return <ErrorState message="Quiz revisions could not be loaded." />;
  return (
    <section className="mt-4">
      <h3 className="font-bold">Quiz revision history</h3>
      {q.data.map((item) => (
        <details
          key={item.version}
          className="mt-2 rounded-xl border bg-white p-3"
        >
          <summary>
            Version {item.version} · {item.createdAt}
          </summary>
          <p className="mt-2 font-semibold">
            {item.quiz.title} · {item.quiz.questions.length} questions
          </p>
          <button
            type="button"
            className="admin-secondary-button mt-3"
            disabled={restore.isPending}
            onClick={() => {
              if (window.confirm(`Restore quiz version ${item.version}? This creates a new revision.`))
                restore.mutate(item.version);
            }}
          >
            Restore this version
          </button>
        </details>
      ))}
    </section>
  );
}
