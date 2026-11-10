import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminAPI } from './admin';

class FakeXHR {
  static status = 201;
  static response = '{"id":"uploaded","kind":"image","status":"available"}';
  status = FakeXHR.status;
  responseText = FakeXHR.response;
  withCredentials = false;
  upload: {
    onprogress?: (event: {
      lengthComputable: boolean;
      loaded: number;
      total: number;
    }) => void;
  } = {};
  onerror?: () => void;
  onload?: () => void;
  open = vi.fn();
  send = vi.fn(() => {
    this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
    this.onload?.();
  });
}

describe('admin media upload', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('sends multipart data and reports upload progress', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
    const progress = vi.fn();
    const result = await adminAPI.uploadMedia(
      new File(['image'], 'road.png', { type: 'image/png' }),
      {
        altText: 'Road',
        caption: '',
        transcript: '',
        language: 'nl',
        sourceReference: '',
      },
      progress,
    );
    expect(result.id).toBe('uploaded');
    expect(progress).toHaveBeenCalledWith(50);
  });

  it('returns the API validation error', async () => {
    FakeXHR.status = 400;
    FakeXHR.response = '{"error":"unsupported file type"}';
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
    await expect(
      adminAPI.uploadMedia(
        new File(['bad'], 'bad.svg', { type: 'image/svg+xml' }),
        {
          altText: 'Bad',
          caption: '',
          transcript: '',
          language: 'nl',
          sourceReference: '',
        },
      ),
    ).rejects.toThrow('unsupported file type');
    FakeXHR.status = 201;
    FakeXHR.response = '{"id":"uploaded"}';
  });
});
