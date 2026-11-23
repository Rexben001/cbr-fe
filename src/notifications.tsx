import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type PropsWithChildren } from 'react';

export type NotificationKind = 'success' | 'error' | 'warning' | 'info';
type Notice = { id: number; kind: NotificationKind; message: string; key: string };
type Notify = (kind: NotificationKind, message: string, options?: { key?: string; duration?: number }) => void;
const NotificationContext = createContext<Notify>(() => undefined);

export function NotificationProvider({ children }: PropsWithChildren) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const sequence = useRef(0);
  const notify = useCallback<Notify>((kind, message, options) => {
    const key = options?.key ?? `${kind}:${message}`;
    setNotices((current) => current.some((item) => item.key === key) ? current : [...current, { id: ++sequence.current, kind, message, key }].slice(-4));
    window.setTimeout(() => setNotices((current) => current.filter((item) => item.key !== key)), options?.duration ?? (kind === 'error' ? 8000 : kind === 'warning' ? 5000 : 3500));
  }, []);
  const value = useMemo(() => notify, [notify]);
  return <NotificationContext.Provider value={value}>{children}<div className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 sm:top-5 sm:w-96" aria-label="Notifications">{notices.map((notice) => <div key={notice.id} role={notice.kind === 'error' || notice.kind === 'warning' ? 'alert' : 'status'} className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-xl ${noticeClass[notice.kind]}`}>{notice.kind === 'success' ? <CheckCircle2 /> : notice.kind === 'error' ? <XCircle /> : notice.kind === 'warning' ? <TriangleAlert /> : <Info />}<p className="min-w-0 flex-1 text-sm font-semibold">{notice.message}</p><button type="button" onClick={() => setNotices((current) => current.filter((item) => item.id !== notice.id))} aria-label="Dismiss notification" className="rounded p-1 hover:bg-black/10"><X size={16} /></button></div>)}</div></NotificationContext.Provider>;
}
const noticeClass: Record<NotificationKind, string> = { success: 'border-emerald-300 bg-emerald-50 text-emerald-950', error: 'border-red-300 bg-red-50 text-red-950', warning: 'border-amber-300 bg-amber-50 text-amber-950', info: 'border-sky-300 bg-sky-50 text-sky-950' };
export function useNotifications() { const notify = useContext(NotificationContext); return { success:(message:string,key?:string)=>notify('success',message,{key}), error:(message:string,key?:string)=>notify('error',message,{key}), warning:(message:string,key?:string)=>notify('warning',message,{key}), info:(message:string,key?:string)=>notify('info',message,{key}) }; }
