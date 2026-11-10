import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { learningAPI } from './api/learning';
import type { LessonDocument } from './api/admin';
import { LessonBuilder } from './lesson-builder';
import { LessonRenderer } from './lesson-blocks';

function providers(children: React.ReactNode) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function BuilderHarness() {
  const [document, setDocument] = useState<LessonDocument>({
    version: 1,
    blocks: [
      {
        id: 'first',
        type: 'text',
        content: { heading: 'First', body: 'First body' },
      },
      {
        id: 'second',
        type: 'text',
        content: { heading: 'Second', body: 'Second body' },
      },
    ],
  });
  return (
    <>
      <output data-testid="order">
        {document.blocks.map((block) => block.id).join(',')}
      </output>
      <LessonBuilder document={document} onChange={setDocument} />
    </>
  );
}

describe('LessonBuilder', () => {
  it('creates blocks, previews them, and supports keyboard-friendly reordering', () => {
    render(providers(<BuilderHarness />));
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Move block down' })[0],
    );
    expect(screen.getByTestId('order')).toHaveTextContent('second,first');
    fireEvent.click(screen.getByRole('button', { name: /^text$/i }));
    expect(screen.getByTestId('order')).toHaveTextContent(
      'second,first,block_',
    );
    fireEvent.click(screen.getByText('Preview lesson'));
    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument();
  });

  it('handles missing media without breaking the lesson', async () => {
    vi.spyOn(learningAPI, 'mediaAccess').mockRejectedValueOnce(
      new Error('missing'),
    );
    const document: LessonDocument = {
      version: 1,
      blocks: [
        { id: 'visual', type: 'image', content: { mediaId: 'missing' } },
      ],
    };
    render(providers(<LessonRenderer document={document} />));
    await waitFor(() =>
      expect(screen.getByText(/Visual unavailable/)).toBeInTheDocument(),
    );
  });
});
