import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Film, Image, Search, UploadCloud, X } from 'lucide-react';
import { ChangeEvent, DragEvent, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { adminAPI, MediaAsset } from './api/admin';
import { authAPI } from './api/auth';
import { AdminLayout } from './admin-ui';
import { ErrorState, Loading } from './components';

type QueueItem = {
  id: string;
  file: File;
  altText: string;
  caption: string;
  transcript: string;
  sourceReference: string;
  progress: number;
  status: 'ready' | 'uploading' | 'done' | 'error';
  error?: string;
};
const accepted = 'image/png,image/jpeg,image/webp,image/gif,video/mp4';
const key = () => crypto.randomUUID();

function AssetPreview({ asset }: { asset: MediaAsset }) {
  return asset.kind === 'video' ? (
    <video
      src={asset.url}
      controls
      preload="metadata"
      className="h-full w-full object-contain"
      aria-label={asset.altText}
    />
  ) : (
    <img
      src={asset.url}
      alt={asset.altText}
      loading="lazy"
      className="h-full w-full object-contain"
    />
  );
}

export function AdminMediaPage() {
  const me = useQuery({ queryKey: ['me'], queryFn: authAPI.me, retry: false });
  const client = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('available');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [dragging, setDragging] = useState(false);
  const library = useQuery({
    queryKey: ['media', search, kind, status],
    queryFn: () => adminAPI.media({ search, kind, status }),
    enabled: me.data?.role === 'admin',
  });
  const posterAssets = useQuery({
    queryKey: ['media-posters'],
    queryFn: () => adminAPI.media({ kind: 'image', status: 'available' }),
    enabled: me.data?.role === 'admin',
  });
  const update = useMutation({
    mutationFn: (asset: MediaAsset) => adminAPI.updateMedia(asset),
    onSuccess: (asset) => {
      client.invalidateQueries({ queryKey: ['media'] });
      setEditing(asset);
    },
  });
  const archive = useMutation({
    mutationFn: adminAPI.archiveMedia,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['media'] });
      setEditing(null);
    },
  });
  const addFiles = (files: FileList | File[]) =>
    setQueue((current) => [
      ...current,
      ...Array.from(files).map((file) => ({
        id: key(),
        file,
        altText: '',
        caption: '',
        transcript: '',
        sourceReference: '',
        progress: 0,
        status: 'ready' as const,
      })),
    ]);
  const uploadAll = async () => {
    for (const item of queue.filter(
      (value) => value.status === 'ready' || value.status === 'error',
    )) {
      if (!item.altText.trim()) {
        setQueue((current) =>
          current.map((value) =>
            value.id === item.id
              ? {
                  ...value,
                  status: 'error',
                  error: 'Alternative text is required.',
                }
              : value,
          ),
        );
        continue;
      }
      setQueue((current) =>
        current.map((value) =>
          value.id === item.id
            ? { ...value, status: 'uploading', error: undefined }
            : value,
        ),
      );
      try {
        await adminAPI.uploadMedia(
          item.file,
          {
            altText: item.altText,
            caption: item.caption,
            transcript: item.transcript,
            language: 'nl',
            sourceReference: item.sourceReference,
          },
          (progress) =>
            setQueue((current) =>
              current.map((value) =>
                value.id === item.id ? { ...value, progress } : value,
              ),
            ),
        );
        setQueue((current) =>
          current.map((value) =>
            value.id === item.id
              ? { ...value, status: 'done', progress: 100 }
              : value,
          ),
        );
        client.invalidateQueries({ queryKey: ['media'] });
      } catch (error) {
        setQueue((current) =>
          current.map((value) =>
            value.id === item.id
              ? {
                  ...value,
                  status: 'error',
                  error:
                    error instanceof Error ? error.message : 'Upload failed.',
                }
              : value,
          ),
        );
      }
    }
  };
  const activeQueue = useMemo(
    () => queue.filter((item) => item.status !== 'done'),
    [queue],
  );
  if (me.isPending) return <Loading />;
  if (!me.data || me.data.role !== 'admin')
    return <Navigate to="/dashboard" replace />;
  return (
    <AdminLayout
      title="Media library"
      description="Upload private images, animated WebP/GIF files and MP4 videos, then reuse them across learning content."
    >
      <section className="admin-card mt-6">
        <input
          ref={input}
          type="file"
          multiple
          accept={accepted}
          className="sr-only"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            event.target.files && addFiles(event.target.files)
          }
        />
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event: DragEvent) => {
            event.preventDefault();
            setDragging(false);
            addFiles(event.dataTransfer.files);
          }}
          className={`grid min-h-40 w-full place-items-center rounded-2xl border-2 border-dashed p-6 text-center transition ${dragging ? 'border-ocean bg-sky' : 'border-slate-300 bg-slate-50 hover:border-ocean'}`}
        >
          <span>
            <UploadCloud className="mx-auto text-ocean" size={34} />
            <strong className="mt-3 block">
              Drop media here or choose files
            </strong>
            <span className="mt-1 block text-sm text-slate-600">
              PNG, JPEG, WebP, GIF up to 10 MB · MP4 up to 100 MB
            </span>
          </span>
        </button>
        {queue.length > 0 && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Upload queue</h2>
              <button
                type="button"
                onClick={uploadAll}
                className="admin-primary-button"
                disabled={!activeQueue.length}
              >
                Upload ready files
              </button>
            </div>
            {queue.map((item) => (
              <div key={item.id} className="rounded-xl border p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-slate-100">
                    {item.file.type === 'video/mp4' ? <Film /> : <Image />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <p className="truncate font-semibold">{item.file.name}</p>
                      <button
                        type="button"
                        aria-label={`Remove ${item.file.name}`}
                        onClick={() =>
                          setQueue((current) =>
                            current.filter((value) => value.id !== item.id),
                          )
                        }
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      {(item.file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="admin-label">
                    Alternative text
                    <input
                      value={item.altText}
                      onChange={(e) =>
                        setQueue((current) =>
                          current.map((value) =>
                            value.id === item.id
                              ? {
                                  ...value,
                                  altText: e.target.value,
                                  status: 'ready',
                                }
                              : value,
                          ),
                        )
                      }
                      className="admin-field"
                    />
                  </label>
                  <label className="admin-label">
                    Caption
                    <input
                      value={item.caption}
                      onChange={(e) =>
                        setQueue((current) =>
                          current.map((value) =>
                            value.id === item.id
                              ? { ...value, caption: e.target.value }
                              : value,
                          ),
                        )
                      }
                      className="admin-field"
                    />
                  </label>
                  <label className="admin-label md:col-span-2">
                    License / source
                    <input
                      value={item.sourceReference}
                      onChange={(e) =>
                        setQueue((current) =>
                          current.map((value) =>
                            value.id === item.id
                              ? { ...value, sourceReference: e.target.value }
                              : value,
                          ),
                        )
                      }
                      className="admin-field"
                    />
                  </label>
                  {item.file.type === 'video/mp4' && (
                    <label className="admin-label md:col-span-2">
                      Transcript
                      <textarea
                        value={item.transcript}
                        onChange={(e) =>
                          setQueue((current) =>
                            current.map((value) =>
                              value.id === item.id
                                ? { ...value, transcript: e.target.value }
                                : value,
                            ),
                          )
                        }
                        className="admin-field"
                      />
                    </label>
                  )}
                </div>
                {item.status === 'uploading' && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-ocean"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
                {item.status === 'done' && (
                  <p className="mt-2 text-sm font-semibold text-emerald-700">
                    Upload complete
                  </p>
                )}
                {item.error && (
                  <p role="alert" className="mt-2 text-sm text-red-700">
                    {item.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="mt-7">
        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-64 flex-1">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={18}
            />
            <input
              aria-label="Search media"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filename, alt text or caption"
              className="admin-field mt-0 pl-10"
            />
          </label>
          <select
            aria-label="Filter media type"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="admin-field mt-0 w-auto"
          >
            <option value="">All types</option>
            <option value="image">Images</option>
            <option value="gif">GIFs</option>
            <option value="video">Videos</option>
          </select>
          <select
            aria-label="Filter media status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="admin-field mt-0 w-auto"
          >
            <option value="available">Available</option>
            <option value="archived">Archived</option>
            <option value="">All statuses</option>
          </select>
        </div>
        {library.isPending ? (
          <Loading />
        ) : library.error ? (
          <div className="mt-4">
            <ErrorState message="Media library could not be loaded." />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {library.data?.media.map((asset) => (
              <button
                type="button"
                key={asset.id}
                onClick={() => setEditing(asset)}
                className="admin-card overflow-hidden p-0 text-left"
              >
                <div className="h-40 bg-slate-100">
                  <AssetPreview asset={asset} />
                </div>
                <div className="p-4">
                  <div className="flex justify-between gap-2">
                    <span className="text-xs font-bold uppercase text-ocean">
                      {asset.kind}
                    </span>
                    <span className="text-xs text-slate-500">
                      {asset.status}
                    </span>
                  </div>
                  <p className="mt-2 truncate font-semibold">
                    {asset.originalFilename || asset.id}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {asset.altText}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit media metadata"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="flex justify-between">
              <h2 className="text-xl font-bold">Edit media</h2>
              <button
                type="button"
                aria-label="Close media editor"
                onClick={() => setEditing(null)}
              >
                <X />
              </button>
            </div>
            <div className="mt-4 h-64 bg-slate-100">
              <AssetPreview asset={editing} />
            </div>
            <div className="mt-4 grid gap-3">
              <label className="admin-label">
                Alternative text
                <input
                  value={editing.altText}
                  onChange={(e) =>
                    setEditing({ ...editing, altText: e.target.value })
                  }
                  className="admin-field"
                />
              </label>
              <label className="admin-label">
                Caption
                <input
                  value={editing.caption}
                  onChange={(e) =>
                    setEditing({ ...editing, caption: e.target.value })
                  }
                  className="admin-field"
                />
              </label>
              {editing.kind === 'video' && (
                <>
                  <label className="admin-label">
                    Poster image
                    <select
                      value={editing.posterMediaId ?? ''}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          posterMediaId: e.target.value || undefined,
                        })
                      }
                      className="admin-field"
                    >
                      <option value="">No poster</option>
                      {posterAssets.data?.media.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.originalFilename || asset.altText}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-label">
                    Transcript
                    <textarea
                      value={editing.transcript}
                      onChange={(e) =>
                        setEditing({ ...editing, transcript: e.target.value })
                      }
                      className="admin-field min-h-28"
                    />
                  </label>
                </>
              )}
              <label className="admin-label">
                License / source
                <input
                  value={editing.sourceReference}
                  onChange={(e) =>
                    setEditing({ ...editing, sourceReference: e.target.value })
                  }
                  className="admin-field"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      'Archive this media? Existing published content will keep working.',
                    )
                  )
                    archive.mutate(editing.id);
                }}
                className="admin-secondary-button text-red-700"
              >
                <Archive className="mr-1 inline" size={17} />
                Archive
              </button>
              <button
                type="button"
                onClick={() => update.mutate(editing)}
                className="admin-primary-button"
              >
                Save metadata
              </button>
            </div>
            {(update.error || archive.error) && (
              <div className="mt-3">
                <ErrorState message="Media change could not be saved." />
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
