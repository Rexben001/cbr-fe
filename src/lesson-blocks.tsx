import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Info, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { learningAPI } from './api/learning';
import type { LessonDocument, MediaAsset } from './api/types';
import { LearnerMedia, MediaPreview } from './media';
import { RichTextContent } from './rich-text';

export function LessonRenderer({
  document,
  fallbackMarkdown = '',
  lessonId,
}: {
  document?: LessonDocument;
  fallbackMarkdown?: string;
  lessonId?: string;
}) {
  if (!document?.blocks?.length)
    return <RichTextContent value={fallbackMarkdown} lessonId={lessonId} />;
  return (
    <div className="space-y-7">
      {document.blocks.map((block) => {
        const content = block.content;
        switch (block.type) {
          case 'text':
            return (
              <section key={block.id}>
                {typeof content.heading === 'string' && content.heading && (
                  <h2 className="text-2xl font-bold">{content.heading}</h2>
                )}
                <RichTextContent value={String(content.body ?? '')} lessonId={lessonId} />
              </section>
            );
          case 'image':
          case 'video':
          case 'animated':
            return (
              <LessonMediaBlock
                key={block.id}
                mediaId={String(content.mediaId ?? '')}
                caption={
                  typeof content.caption === 'string' ? content.caption : ''
                }
                layout={String(content.layout ?? 'wide')}
              />
            );
          case 'callout':
            return (
              <Callout
                key={block.id}
                variant={String(content.variant ?? 'rule')}
                title={String(content.title ?? '')}
                body={String(content.body ?? '')}
              />
            );
          case 'scenario':
            return (
              <ScenarioBlock
                key={block.id}
                scenarioId={String(content.scenarioId ?? '')}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

function LessonMediaBlock({
  mediaId,
  caption,
  layout,
}: {
  mediaId: string;
  caption: string;
  layout: string;
}) {
  const access = useQuery({
    queryKey: ['media-access', mediaId],
    queryFn: () => learningAPI.mediaAccess(mediaId),
    enabled: Boolean(mediaId),
    retry: false,
    staleTime: 60_000,
  });
  if (access.isPending)
    return <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />;
  if (!access.data)
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-amber-900">
        Visual unavailable. Continue with the surrounding explanation.
      </p>
    );
  const asset: MediaAsset = {
    ...access.data.media,
    caption: caption || access.data.media.caption,
  };
  const width =
    layout === 'compact'
      ? 'max-w-md'
      : layout === 'center'
        ? 'max-w-2xl'
        : 'max-w-full';
  return (
    <div className={`${width} mx-auto`}>
      <MediaPreview asset={asset} />
    </div>
  );
}

function Callout({
  variant,
  title,
  body,
}: {
  variant: string;
  title: string;
  body: string;
}) {
  const Icon =
    variant === 'warning'
      ? AlertTriangle
      : variant === 'tip'
        ? Lightbulb
        : Info;
  const style =
    variant === 'warning'
      ? 'border-amber-300 bg-amber-50 text-amber-950'
      : variant === 'tip'
        ? 'border-sky-300 bg-sky text-ink'
        : 'border-teal-300 bg-teal-50 text-teal-950';
  return (
    <aside className={`rounded-2xl border p-5 ${style}`}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 shrink-0" />
        <div>
          {title && <h3 className="font-bold">{title}</h3>}
          <p className="mt-1 leading-7">{body}</p>
        </div>
      </div>
    </aside>
  );
}

function ScenarioBlock({ scenarioId }: { scenarioId: string }) {
  const scenario = useQuery({
    queryKey: ['scenario', scenarioId],
    queryFn: () => learningAPI.getScenario(scenarioId),
    enabled: Boolean(scenarioId),
    retry: false,
  });
  if (scenario.isPending)
    return <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />;
  if (!scenario.data)
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-amber-900">
        Embedded scenario is unavailable.
      </p>
    );
  return (
    <section className="rounded-2xl border bg-slate-50 p-4">
      <p className="text-sm font-bold text-ocean">INTERACTIVE SCENARIO</p>
      <h3 className="mt-1 text-xl font-bold">{scenario.data.title}</h3>
      <div className="mt-4 max-w-xl">
        {scenario.data.mediaId ? (
          <LearnerMedia type="scenario" contentId={scenario.data.mediaId} />
        ) : (
          <p className="rounded-xl bg-white p-4 text-sm text-slate-600">
            Scenario media preview is unavailable for this item.
          </p>
        )}
      </div>
      <Link
        to={`/scenarios/${scenarioId}`}
        className="mt-4 inline-block font-bold text-ocean"
      >
        Open interactive scenario →
      </Link>
    </section>
  );
}
