import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authAPI } from './api/auth';
import { AdminLayout } from './admin-ui';
import { Loading } from './components';
import { RevisionHistory } from './revisions';

type RevisionType = 'topics' | 'lessons' | 'questions' | 'scenarios';

export function AdminTopicRevisionsPage() {
  return (
    <AdminRevisionsPage type="topics" label="Topic" backTo="/admin/topics" />
  );
}

export function AdminRevisionsPage({
  type,
  label,
  backTo,
}: {
  type: RevisionType;
  label: string;
  backTo: string;
}) {
  const { id = '' } = useParams();
  const user = useQuery({
    queryKey: ['me'],
    queryFn: authAPI.me,
    retry: false,
  });
  if (user.isPending) return <Loading />;
  if (!user.data || user.data.role !== 'admin')
    return <Navigate to="/dashboard" replace />;
  return (
    <AdminLayout
      title={`${label} revision history`}
      description="Inspect previous saved versions before making or publishing another change."
    >
      <Link to={backTo} className="font-semibold text-ocean">
        ← Back to {label.toLowerCase()}s
      </Link>
      <RevisionHistory type={type} id={id} />
    </AdminLayout>
  );
}
