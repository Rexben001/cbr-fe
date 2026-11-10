import { RichTextContent } from './rich-text';

// This intentionally renders a small, safe Markdown subset; lesson text is never injected as HTML.
export function LessonContent({ content }: { content: string }) {
  return <RichTextContent value={content} />;
}
