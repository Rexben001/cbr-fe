import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LearnerHome } from './learner-home';

describe('LearnerHome', () => {
  it('orders continue, one prominent search, compact topics, and quick access', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) return new Response(JSON.stringify({ id: 'u1', email: 'learner@example.test', displayName: 'Sam', preferredLanguage: 'en', role: 'learner' }), { status: 200 });
      if (url.endsWith('/learning-path')) return new Response(JSON.stringify({ lessons: [{ id: 'l1', topicId: 'm1', title: 'Priority basics', displayOrder: 0, completed: false, unlocked: true }] }), { status: 200 });
      if (url.endsWith('/topics')) return new Response(JSON.stringify({ topics: [{ id: 'm1', slug: 'priority', title: 'Priority', description: 'Priority rules', displayOrder: 0 }] }), { status: 200 });
      if (url.includes('/topics/m1/lessons')) return new Response(JSON.stringify({ lessons: [{ id: 'l1', topicId: 'm1', slug: 'basics', title: 'Priority basics', content: '', displayOrder: 0, document: { version: 1, blocks: [] } }] }), { status: 200 });
      return new Response(JSON.stringify({ results: [] }), { status: 200 });
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><LearnerHome /></MemoryRouter></QueryClientProvider>);

    const continueLink = await screen.findByRole('link', { name: /continue learning/i });
    expect(continueLink).toHaveAttribute('href', '/lessons/l1');
    expect(screen.getByText(/current lesson:/i)).toHaveTextContent('Priority basics');
    expect(screen.getAllByRole('textbox', { name: /search topics and lessons/i })).toHaveLength(1);
    expect(screen.queryByRole('link', { name: /search all lessons/i })).not.toBeInTheDocument();
    const searchHeading = screen.getByRole('heading', { name: /search topics and lessons/i });
    const topicsHeading = screen.getByRole('heading', { name: /explore topics/i });
    expect(searchHeading.compareDocumentPosition(topicsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(await screen.findByText('1 lesson')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /scenarios/i })).toHaveAttribute('href', '/scenarios');
    expect(screen.getByRole('link', { name: /review mistakes/i })).toHaveAttribute('href', '/practice/revision');
    expect(screen.getByRole('link', { name: /mock exam/i })).toHaveAttribute('href', '/exams');
  });
});
