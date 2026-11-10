import {
  BarChart3,
  BookOpen,
  FolderKanban,
  HelpCircle,
  Image,
  Map,
  Plus,
  Route,
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
          <Route size={19} /> Content studio
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
      </aside>
      <div className="min-w-0 flex-1">
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
