import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminAPI } from './api/admin';
import { learningAPI } from './api/learning';
import { RichTextContent, RichTextEditor } from './rich-text';

afterEach(() => vi.restoreAllMocks());

describe('RichTextContent media', () => {
  it('resolves and renders an embedded private media asset for a learner', async () => {
    vi.spyOn(learningAPI, 'mediaAccess').mockResolvedValue({
      media: {
        id: 'media_123',
        kind: 'image',
        url: 'https://media.example.test/signed',
        altText: 'Priority intersection',
        caption: 'Look carefully',
        transcript: '',
        sourceReference: 'RijFiks',
      },
      expiresAt: '2026-11-03T12:00:00Z',
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <RichTextContent
          value={
            'Before\n\n[[media:media_123|width=45|align=left|title=Look%20right]]\n\nAfter'
          }
        />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('img', { name: 'Priority intersection' }),
    ).toHaveAttribute('src', 'https://media.example.test/signed');
    const embedded = screen.getByRole('region', { name: 'Look right' });
    expect(embedded).toHaveStyle({ width: '45%', float: 'left' });
    expect(
      screen.getByRole('heading', { name: 'Look right' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Look carefully')).toBeInTheDocument();
    expect(learningAPI.mediaAccess).toHaveBeenCalledWith('media_123');
  });

  it('lets an administrator insert a library asset at the editor cursor', async () => {
    const asset = {
      id: 'media_456',
      kind: 'image' as const,
      url: 'https://media.example.test/admin-signed',
      originalFilename: 'crossroads.png',
      mimeType: 'image/png',
      fileSize: 2048,
      altText: 'Crossroads',
      caption: 'Priority example',
      transcript: '',
      language: 'nl',
      sourceReference: 'RijFiks',
      status: 'available' as const,
      createdAt: '2026-11-03T12:00:00Z',
      updatedAt: '2026-11-03T12:00:00Z',
    };
    vi.spyOn(adminAPI, 'media').mockResolvedValue({ media: [asset] });
    vi.spyOn(adminAPI, 'getMedia').mockResolvedValue(asset);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function Harness() {
      const [value, setValue] = useState('Choose carefully.');
      return (
        <>
          <output data-testid="stored-rich-text">{value}</output>
          <RichTextEditor
            value={value}
            onChange={setValue}
            label="Question text"
          />
        </>
      );
    }

    render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Insert media' }));
    fireEvent.click(
      await screen.findByRole('button', { name: /crossroads\.png/i }),
    );

    await waitFor(() =>
      expect(screen.getByTestId('stored-rich-text')).toHaveTextContent(
        '[[media:media_456]]',
      ),
    );
    await waitFor(() =>
      expect(adminAPI.getMedia).toHaveBeenCalledWith('media_456'),
    );
    const widthControl = await screen.findByRole('slider', {
      name: 'Media width',
    });
    fireEvent.change(widthControl, { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'Wrap text on left' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Media title' }), {
      target: { value: 'Approaching crossroads' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('stored-rich-text')).toHaveTextContent(
        '[[media:media_456|width=60|align=right|title=Approaching%20crossroads]]',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Move media down' }));
    await waitFor(() => {
      const stored = screen.getByTestId('stored-rich-text').textContent ?? '';
      expect(stored.indexOf('Choose carefully.')).toBeLessThan(
        stored.indexOf('[[media:media_456'),
      );
    });
    fireEvent.click(screen.getByRole('button', { name: 'Move media up' }));
    await waitFor(() => {
      const stored = screen.getByTestId('stored-rich-text').textContent ?? '';
      expect(stored.indexOf('[[media:media_456')).toBeLessThan(
        stored.indexOf('Choose carefully.'),
      );
    });
  });
});
