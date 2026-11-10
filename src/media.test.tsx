import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { LearnerMedia, MediaPreview } from './media';

describe('MediaPreview', () => {
  it('renders accessible images with attribution', () => {
    render(
      <MediaPreview
        asset={{
          id: 'sign',
          kind: 'image',
          url: 'https://example.com/sign.png',
          altText: 'Priority road sign',
          caption: 'Study this sign',
          transcript: '',
          sourceReference: 'Original RijFiks illustration',
        }}
      />,
    );
    expect(
      screen.getByRole('img', { name: 'Priority road sign' }),
    ).toHaveAttribute('src', 'https://example.com/sign.png');
    expect(screen.getByText('Study this sign')).toBeInTheDocument();
    expect(
      screen.getByText(/Original RijFiks illustration/),
    ).toBeInTheDocument();
  });

  it('renders videos with controls', () => {
    const { container } = render(
      <MediaPreview
        asset={{
          id: 'clip',
          kind: 'video',
          url: 'https://example.com/clip.mp4',
          altText: 'Vehicle approaching',
          caption: '',
          transcript: '',
          sourceReference: '',
        }}
      />,
    );
    expect(container.querySelector('video')).toHaveAttribute('controls');
  });

  it('falls back to direct media access when a scenario stores an asset id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/content-media/')) {
        return new Response(JSON.stringify({ media: [] }), { status: 200 });
      }
      if (url.includes('/media/media_123/access')) {
        return new Response(
          JSON.stringify({
            media: {
              id: 'media_123',
              kind: 'video',
              url: 'https://example.com/demo.mp4',
              altText: 'Video demo',
              caption: '',
              transcript: '',
              sourceReference: '',
              status: 'available',
            },
            expiresAt: '2099-01-01T00:00:00Z',
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <LearnerMedia type="scenario" contentId="media_123" />
      </QueryClientProvider>,
    );

    expect(await screen.findByLabelText(/video demo/i)).toBeInTheDocument();
    fetchMock.mockRestore();
  });
});
