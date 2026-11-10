import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import { adminAPI, LessonBlock, LessonDocument } from './api/admin';
import { LessonRenderer } from './lesson-blocks';
import { RichTextEditor } from './rich-text';

const id = () => `block_${crypto.randomUUID()}`;
const emptyContent = (type: LessonBlock['type']): Record<string, unknown> =>
  type === 'text'
    ? { heading: '', body: '' }
    : type === 'callout'
      ? { variant: 'rule', title: '', body: '' }
      : type === 'scenario'
        ? { scenarioId: '' }
        : { mediaId: '', caption: '', layout: 'wide' };

export function LessonBuilder({
  document,
  onChange,
}: {
  document: LessonDocument;
  onChange: (document: LessonDocument) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const add = (type: LessonBlock['type']) =>
    onChange({
      ...document,
      blocks: [
        ...document.blocks,
        { id: id(), type, content: emptyContent(type) },
      ],
    });
  const update = (block: LessonBlock) =>
    onChange({
      ...document,
      blocks: document.blocks.map((value) =>
        value.id === block.id ? block : value,
      ),
    });
  const remove = (blockId: string) =>
    onChange({
      ...document,
      blocks: document.blocks.filter((value) => value.id !== blockId),
    });
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= document.blocks.length) return;
    onChange({
      ...document,
      blocks: arrayMove(document.blocks, index, target),
    });
  };
  const dropped = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    const from = document.blocks.findIndex(
      (block) => block.id === event.active.id,
    );
    const to = document.blocks.findIndex(
      (block) => block.id === event.over?.id,
    );
    onChange({ ...document, blocks: arrayMove(document.blocks, from, to) });
  };
  return (
    <section>
      <div className="rounded-2xl border bg-slate-50 p-4">
        <p className="text-sm font-bold text-slate-700">Add learning block</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              'text',
              'image',
              'video',
              'animated',
              'callout',
              'scenario',
            ] as const
          ).map((type) => (
            <button
              type="button"
              key={type}
              onClick={() => add(type)}
              className="admin-secondary-button capitalize"
            >
              <Plus size={15} className="mr-1 inline" />
              {type}
            </button>
          ))}
        </div>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={dropped}
      >
        <SortableContext
          items={document.blocks.map((block) => block.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-4 space-y-3">
            {document.blocks.map((block, index) => (
              <SortableBlock
                key={block.id}
                block={block}
                index={index}
                total={document.blocks.length}
                update={update}
                remove={remove}
                move={move}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {document.blocks.length === 0 && (
        <p className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
          No blocks yet. Existing Markdown remains the learner fallback.
        </p>
      )}
      <details className="mt-6 rounded-2xl border bg-white p-4">
        <summary className="cursor-pointer font-bold">Preview lesson</summary>
        <div className="mt-5">
          <LessonRenderer document={document} />
        </div>
      </details>
    </section>
  );
}

function SortableBlock({
  block,
  index,
  total,
  update,
  remove,
  move,
}: {
  block: LessonBlock;
  index: number;
  total: number;
  update: (block: LessonBlock) => void;
  remove: (id: string) => void;
  move: (index: number, direction: -1 | 1) => void;
}) {
  const sortable = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const set = (key: string, value: unknown) =>
    update({ ...block, content: { ...block.content, [key]: value } });
  return (
    <article
      ref={sortable.setNodeRef}
      style={style}
      className="rounded-2xl border bg-white p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 border-b pb-3">
        <button
          type="button"
          aria-label={`Drag ${block.type} block`}
          {...sortable.attributes}
          {...sortable.listeners}
          className="cursor-grab text-slate-500"
        >
          <GripVertical />
        </button>
        <strong className="capitalize">{block.type} block</strong>
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            aria-label="Move block up"
            disabled={index === 0}
            onClick={() => move(index, -1)}
            className="admin-secondary-button px-2 disabled:opacity-30"
          >
            <ArrowUp size={16} />
          </button>
          <button
            type="button"
            aria-label="Move block down"
            disabled={index === total - 1}
            onClick={() => move(index, 1)}
            className="admin-secondary-button px-2 disabled:opacity-30"
          >
            <ArrowDown size={16} />
          </button>
          <button
            type="button"
            aria-label="Delete block"
            onClick={() => remove(block.id)}
            className="admin-secondary-button px-2 text-red-700"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="mt-4">
        <BlockFields block={block} set={set} />
      </div>
    </article>
  );
}

function BlockFields({
  block,
  set,
}: {
  block: LessonBlock;
  set: (key: string, value: unknown) => void;
}) {
  if (block.type === 'text')
    return (
      <div className="space-y-3">
        <label className="admin-label">
          Heading
          <input
            value={String(block.content.heading ?? '')}
            onChange={(e) => set('heading', e.target.value)}
            className="admin-field"
          />
        </label>
        <label className="admin-label">Body</label>
        <RichTextEditor
          label="Lesson block body"
          value={String(block.content.body ?? '')}
          onChange={(value) => set('body', value)}
        />
      </div>
    );
  if (block.type === 'callout')
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <label className="admin-label">
          Style
          <select
            value={String(block.content.variant ?? 'rule')}
            onChange={(e) => set('variant', e.target.value)}
            className="admin-field"
          >
            <option value="rule">Important rule</option>
            <option value="warning">Warning</option>
            <option value="tip">Exam tip</option>
          </select>
        </label>
        <label className="admin-label">
          Title
          <input
            value={String(block.content.title ?? '')}
            onChange={(e) => set('title', e.target.value)}
            className="admin-field"
          />
        </label>
        <div className="md:col-span-2">
          <label className="admin-label mb-1">Message</label>
          <RichTextEditor
            label="Callout message"
            minHeight="7rem"
            value={String(block.content.body ?? '')}
            onChange={(value) => set('body', value)}
          />
        </div>
      </div>
    );
  if (block.type === 'scenario')
    return (
      <ScenarioField
        value={String(block.content.scenarioId ?? '')}
        onChange={(value) => set('scenarioId', value)}
      />
    );
  return (
    <MediaField
      kind={block.type}
      mediaId={String(block.content.mediaId ?? '')}
      caption={String(block.content.caption ?? '')}
      layout={String(block.content.layout ?? 'wide')}
      set={set}
    />
  );
}

function MediaField({
  kind,
  mediaId,
  caption,
  layout,
  set,
}: {
  kind: string;
  mediaId: string;
  caption: string;
  layout: string;
  set: (key: string, value: unknown) => void;
}) {
  const media = useQuery({
    queryKey: ['media-builder', kind],
    queryFn: () =>
      adminAPI.media({
        kind: kind === 'animated' ? '' : kind,
        status: 'available',
      }),
  });
  const choices = media.data?.media.filter(
    (asset) =>
      kind !== 'animated' ||
      asset.kind === 'gif' ||
      asset.mimeType === 'image/webp',
  );
  const selected = choices?.find((asset) => asset.id === mediaId);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="admin-label">
        Media asset
        <select
          value={mediaId}
          onChange={(e) => set('mediaId', e.target.value)}
          className="admin-field"
        >
          <option value="">Choose media…</option>
          {choices?.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.originalFilename || asset.altText}
            </option>
          ))}
        </select>
      </label>
      <label className="admin-label">
        Layout
        <select
          value={layout}
          onChange={(e) => set('layout', e.target.value)}
          className="admin-field"
        >
          <option value="wide">Wide</option>
          <option value="center">Centered</option>
          <option value="compact">Compact</option>
        </select>
      </label>
      <label className="admin-label md:col-span-2">
        Block caption override
        <input
          value={caption}
          onChange={(e) => set('caption', e.target.value)}
          className="admin-field"
        />
      </label>
      {selected && (
        <div className="md:col-span-2 overflow-hidden rounded-xl bg-slate-100">
          {selected.kind === 'video' ? (
            <video
              src={selected.url}
              controls
              preload="metadata"
              className="max-h-56 w-full object-contain"
            />
          ) : (
            <img
              src={selected.url}
              alt={selected.altText}
              className="max-h-56 w-full object-contain"
            />
          )}
        </div>
      )}
    </div>
  );
}

function ScenarioField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const scenarios = useQuery({
    queryKey: ['admin-scenarios'],
    queryFn: adminAPI.scenarios,
  });
  return (
    <label className="admin-label">
      Published scenario
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="admin-field"
      >
        <option value="">Choose scenario…</option>
        {scenarios.data?.scenarios
          .filter((item) => item.status === 'published')
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
      </select>
    </label>
  );
}
