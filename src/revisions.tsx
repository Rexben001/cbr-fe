import { useQuery } from '@tanstack/react-query';
import { adminAPI } from './api/admin';
import { ErrorState, Loading } from './components';
export function RevisionHistory({
  type,
  id,
}: {
  type: 'topics' | 'lessons' | 'questions' | 'scenarios';
  id: string;
}) {
  const q = useQuery({
    queryKey: ['revisions', type, id],
    queryFn: () => adminAPI.revisions(type, id),
    enabled: Boolean(id),
  });
  if (q.isPending) return <Loading />;
  if (!q.data)
    return <ErrorState message="Revision history could not be loaded." />;
  return (
    <section className="mt-5">
      <h2 className="font-bold">Revision history</h2>
      {q.data.revisions.map((v) => (
        <details key={v.version} className="mt-2 rounded border bg-white p-3">
          <summary>
            Version {v.version} · {v.changedAt}
          </summary>
          <pre className="mt-2 overflow-auto text-xs">
            {JSON.stringify(v.snapshot, null, 2)}
          </pre>
        </details>
      ))}
    </section>
  );
}
