import { X } from 'lucide-react';
import { RichTextContent } from './rich-text';

// Preview is intentionally display-only: it does not mount learner quiz or
// progress components, so inspecting a draft cannot create learner attempts.
export function AdminFullscreenPreview({
  title,
  content,
  onClose,
}: {
  title: string;
  content: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label={`Preview ${title}`}>
      <article className="mx-auto min-h-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <header className="sticky top-0 flex items-center justify-between border-b bg-white/95 px-5 py-4 backdrop-blur">
          <div><p className="text-xs font-bold tracking-widest text-ocean">ADMIN PREVIEW</p><h1 className="text-xl font-bold">{title}</h1></div>
          <button type="button" onClick={onClose} className="admin-secondary-button"><X size={17} /> Close preview</button>
        </header>
        <div className="p-5 sm:p-9"><RichTextContent value={content || 'No preview content has been added yet.'} /></div>
      </article>
    </div>
  );
}
