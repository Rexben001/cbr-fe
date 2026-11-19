import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminFeatureFlagsPage } from './admin-feature-flags';
import type { FeatureValues } from './api/features';
import { FeatureRoute } from './feature-flags';

const allEnabled: FeatureValues = {
  learning_roadmap: true,
  learner_dashboard: true,
  practice_hub: true,
  traffic_signs: true,
  dashboard_symbols: true,
  mock_exams: true,
  scenarios: true,
  global_search: true,
  saved_items: true,
  topic_checkpoints: true,
  embedded_lesson_quizzes: true,
  driving_school_finder: true,
  account_settings: true,
};

afterEach(() => vi.restoreAllMocks());

describe('feature flags', () => {
  it('blocks a disabled learner route', async () => {
    const client = new QueryClient();
    client.setQueryData(['feature-flags'], { ...allEnabled, scenarios: false });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter><FeatureRoute feature="scenarios"><p>Scenario content</p></FeatureRoute></MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText('Feature temporarily unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Scenario content')).not.toBeInTheDocument();
  });

  it('lets an administrator toggle a feature', async () => {
    const calls: Array<{ url: string; method: string }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method });
      if (url.endsWith('/api/v1/auth/me'))
        return new Response(JSON.stringify({ id: 'admin', email: 'admin@example.test', displayName: 'Admin', preferredLanguage: 'en', role: 'admin' }), { status: 200 });
      if (url.endsWith('/api/v1/admin/feature-flags') && method === 'GET')
        return new Response(JSON.stringify({ featureFlags: [{ key: 'traffic_signs', name: 'Traffic signs', description: 'Traffic-sign learning.', enabled: true, updatedAt: '2026-11-20T00:00:00Z' }] }), { status: 200 });
      if (url.endsWith('/api/v1/admin/feature-flags/traffic_signs') && method === 'PATCH')
        return new Response(JSON.stringify({ key: 'traffic_signs', name: 'Traffic signs', description: 'Traffic-sign learning.', enabled: false, updatedAt: '2026-11-20T00:01:00Z' }), { status: 200 });
      if (url.endsWith('/api/v1/features'))
        return new Response(JSON.stringify({ features: { ...allEnabled, traffic_signs: false } }), { status: 200 });
      return new Response('{}', { status: 404 });
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter><AdminFeatureFlagsPage /></MemoryRouter>
      </QueryClientProvider>,
    );
    const toggle = await screen.findByRole('switch', { name: 'Disable Traffic signs' });
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Enable Traffic signs' })).toHaveAttribute('aria-checked', 'false'));
    expect(calls).toContainEqual({ url: '/api/v1/admin/feature-flags/traffic_signs', method: 'PATCH' });
  });
});

