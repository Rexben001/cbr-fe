import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Film, Image as ImageIcon, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from './api/admin';
import { learningAPI } from './api/learning';
import type { MediaAsset } from './api/types';
import { ErrorState, Loading } from './components';

type MediaContentType = 'lesson' | 'question' | 'scenario';

export function MediaPreview({ asset }: { asset: MediaAsset }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {asset.kind === 'video' ? (
        asset.posterMediaId ? (
          <VideoPreview asset={asset} />
        ) : (
          <video
            src={asset.url}
            controls
            preload="metadata"
            className="max-h-[32rem] w-full bg-black object-contain"
            aria-label={asset.altText}
          />
        )
      ) : (
        <img
          src={asset.url}
          alt={asset.altText}
          loading="lazy"
          className="max-h-[32rem] w-full object-contain"
        />
      )}
      {(asset.caption || asset.sourceReference) && (
        <figcaption className="space-y-1 border-t p-3 text-sm text-slate-600">
          {asset.caption && <p>{asset.caption}</p>}
          {asset.sourceReference && (
            <p className="text-xs">Source: {asset.sourceReference}</p>
          )}
        </figcaption>
      )}
      {asset.transcript && (
        <details className="border-t p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-ocean">
            Read transcript
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-slate-700">
            {asset.transcript}
          </p>
        </details>
      )}
    </figure>
  );
}

function VideoPreview({ asset }: { asset: MediaAsset }) {
  const poster = useQuery({
    queryKey: ['media-access', asset.posterMediaId],
    queryFn: () => learningAPI.mediaAccess(asset.posterMediaId!),
    enabled: Boolean(asset.posterMediaId),
    retry: false,
    staleTime: 60_000,
  });
  return (
    <video
      src={asset.url}
      poster={poster.data?.media.url}
      controls
      preload="metadata"
      className="max-h-[32rem] w-full bg-black object-contain"
      aria-label={asset.altText}
    />
  );
}

export function HistoricalMedia({
  assets,
}: {
  assets: Array<{
    id: string;
    kind: 'image' | 'video' | 'gif';
    altText: string;
    caption: string;
    transcript: string;
  }>;
}) {
  return (
    <section className="my-6 space-y-4">
      {assets.map((asset) => (
        <HistoricalAsset key={asset.id} asset={asset} />
      ))}
    </section>
  );
}
function HistoricalAsset({
  asset,
}: {
  asset: {
    id: string;
    kind: 'image' | 'video' | 'gif';
    altText: string;
    caption: string;
    transcript: string;
  };
}) {
  const access = useQuery({
    queryKey: ['media-access', asset.id],
    queryFn: () => learningAPI.mediaAccess(asset.id),
    staleTime: 60_000,
    retry: false,
  });
  if (access.isPending)
    return <div className="h-32 animate-pulse rounded-xl bg-slate-100" />;
  if (!access.data)
    return (
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        Media is temporarily unavailable. {asset.altText}
      </p>
    );
  return (
    <MediaPreview
      asset={{
        ...access.data.media,
        ...asset,
        url: access.data.media.url,
        posterMediaId: access.data.media.posterMediaId,
        sourceReference: '',
      }}
    />
  );
}

export function LearnerMedia({
  type,
  contentId,
}: {
  type: MediaContentType;
  contentId: string;
}) {
  const media = useQuery({
    queryKey: ['content-media', type, contentId],
    queryFn: async () => {
      try {
        const linked = await learningAPI.contentMedia(type, contentId);
        if (linked.length) return linked;
      } catch {
        // Fall back to direct media access for scenario assets that are stored by id.
      }
      try {
        const direct = await learningAPI.mediaAccess(contentId);
        return [direct.media];
      } catch {
        return [];
      }
    },
    enabled: Boolean(contentId),
    retry: false,
  });
  if (media.isPending || media.error || !media.data?.length) return null;
  return (
    <section className="my-6 space-y-4" aria-label="Learning media">
      {media.data.map((asset) => (
        <MediaPreview key={asset.id} asset={asset} />
      ))}
    </section>
  );
}

export function AdminMediaPicker({
  type,
  contentId,
}: {
  type: MediaContentType;
  contentId: string;
}) {
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const library = useQuery({
    queryKey: ['media-picker', search, kind],
    queryFn: () => adminAPI.media({ search, kind, status: 'available' }),
  });
  const attached = useQuery({
    queryKey: ['content-media-admin', type, contentId],
    queryFn: () => adminAPI.contentMedia(type, contentId),
    enabled: Boolean(contentId),
  });
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    if (attached.data)
      setSelected(attached.data.media.map((asset) => asset.id));
  }, [attached.data]);
  const save = useMutation({
    mutationFn: () => adminAPI.setContentMedia(type, contentId, selected),
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: ['content-media-admin', type, contentId],
      });
      client.invalidateQueries({
        queryKey: ['content-media', type, contentId],
      });
    },
  });
  if (!contentId)
    return (
      <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        Save this content first, then attach media.
      </div>
    );
  if (library.isPending || attached.isPending) return <Loading />;
  if (!library.data || !attached.data)
    return <ErrorState message="Media picker could not be loaded." />;
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  return (
    <section className="mt-6 border-t border-slate-200 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">Attached media</h3>
          <p className="text-sm text-slate-600">
            Select assets in display order. Images, GIFs and videos appear above
            learner content.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/media" className="admin-secondary-button">
            Open library
          </Link>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="admin-secondary-button"
          >
            {save.isPending ? 'Saving media…' : 'Save media'}
          </button>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-3 text-slate-400" size={17} />
          <input
            aria-label="Search picker media"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-field mt-0 pl-9"
            placeholder="Search media"
          />
        </label>
        <select
          aria-label="Filter picker media"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="admin-field mt-0 w-auto"
        >
          <option value="">All</option>
          <option value="image">Images</option>
          <option value="gif">GIFs</option>
          <option value="video">Videos</option>
        </select>
      </div>
      {library.data.media.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
          No matching available media. Upload an asset from Media library first.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {library.data.media.map((asset) => {
            const active = selected.includes(asset.id);
            return (
              <button
                type="button"
                key={asset.id}
                onClick={() => toggle(asset.id)}
                className={`overflow-hidden rounded-xl border text-left ${active ? 'border-ocean ring-2 ring-teal-100' : 'border-slate-200'}`}
              >
                <div className="relative h-28 bg-slate-100">
                  {asset.kind === 'video' ? (
                    <div className="grid h-full place-items-center">
                      <Film className="text-ocean" />
                    </div>
                  ) : (
                    <img
                      src={asset.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                  {active && (
                    <span className="absolute right-2 top-2 rounded-full bg-ocean p-1 text-white">
                      <Check size={15} />
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate font-semibold">{asset.altText}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs uppercase text-slate-500">
                    <ImageIcon size={13} />
                    {asset.kind} · {asset.id}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {save.isSuccess && (
        <p
          role="status"
          className="mt-3 text-sm font-semibold text-emerald-700"
        >
          Media attachments saved.
        </p>
      )}
      {save.error && (
        <div className="mt-3">
          <ErrorState message="Media attachments could not be saved." />
        </div>
      )}
    </section>
  );
}
