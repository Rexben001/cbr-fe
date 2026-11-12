import {
  BarChart3,
  BookOpen,
  FolderKanban,
  HelpCircle,
  Image,
  Map,
  Plus,
  Route,
  Settings2,
} from 'lucide-react';
import type { PropsWithChildren, ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

const navigation = [
  { to: '/admin', label: 'Overview', icon: BarChart3 },
  { to: '/admin/topics', label: 'Topics', icon: FolderKanban },
  { to: '/admin/lessons', label: 'Lessons', icon: BookOpen },
  { to: '/admin/questions', label: 'Questions', icon: HelpCircle },
  { to: '/admin/scenarios', label: 'Scenarios', icon: Map },
  { to: '/admin/media', label: 'Media library', icon: Image },
];

export function AdminLayout({
  title,
  description,
  action,
  children,
}: PropsWithChildren<{
  title: string;
  description: string;
  action?: ReactNode;
}>) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <Route size={19} /> RijFiks <span>Studio</span>
        </div>
        <nav aria-label="Content administration" className="admin-nav">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              end={to === '/admin'}
              key={to}
              to={to}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? 'admin-nav-link-active' : ''}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <Link to="/dashboard" className="admin-back-link">
          ← Learner dashboard
        </Link>
        <Link to="/" className="admin-back-link">
          <Settings2 size={15} /> View learning site
        </Link>
      </aside>
      <div className="min-w-0 flex-1 admin-content-frame">
        <header className="admin-page-header">
          <div>
            <p className="admin-eyebrow">ADMINISTRATION</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {action}
        </header>
        {children}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge status-${status.replace('_', '-')}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function NewItemButton({
  onClick,
  label = 'New item',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button type="button" onClick={onClick} className="admin-primary-button">
      <Plus size={18} />
      {label}
    </button>
  );
}

export function AdminListControls({
  search,
  onSearch,
  status,
  onStatus,
  count,
  offset,
  pageSize,
  onPrevious,
  onNext,
}: {
  search?: string;
  onSearch?: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  count: number;
  offset: number;
  pageSize: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return <div className="border-b border-slate-200 p-3">
    {onSearch && <input className="admin-field mb-2" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search this list" aria-label="Search content" />}
    <div className="flex items-center gap-2"><select className="admin-field mt-0 flex-1" value={status} onChange={(event) => onStatus(event.target.value)} aria-label="Filter by status"><option value="">All statuses</option><option value="draft">Draft</option><option value="in_review">In review</option><option value="published">Published</option><option value="archived">Archived</option></select><span className="text-xs text-slate-500">{offset + 1}–{offset + count}</span></div>
    <div className="mt-2 flex gap-2"><button type="button" className="admin-secondary-button" disabled={offset === 0} onClick={onPrevious}>Previous</button><button type="button" className="admin-secondary-button" disabled={count < pageSize} onClick={onNext}>Next</button></div>
  </div>;
}
