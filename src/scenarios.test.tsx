import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ScenarioPage } from './scenarios';
import type { Scenario } from './api/types';

const scenario: Scenario = {
  id: 'right-priority',
  title: 'Priority',
  topic: 'priority_rules',
  difficulty: 'easy',
  description: 'Look at the road layout before deciding.',
  mediaType: 'image',
  mediaId: 'asset-1',
  questionType: 'single_select',
  questionText: 'Who should move first?',
  options: [
    { id: 'yield-right', text: 'Wait for traffic from the right' },
    { id: 'drive-first', text: 'Drive first' },
  ],
  correctAnswerIds: ['yield-right'],
  explanation: 'Traffic from the right has priority.',
  examEligible: true,
  contentReviewed: false,
};

describe('ScenarioPage', () => {
  it('renders the question prompt and submits a single-select answer', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes('/content-media/'))
          return new Response(JSON.stringify({ media: [] }), { status: 200 });
        if (url.includes('/media/asset-1/access'))
          return new Response(
            JSON.stringify({
              media: {
                id: 'asset-1',
                kind: 'image',
                url: 'https://example.com/asset.png',
                altText: 'Priority road sign',
                caption: '',
                transcript: '',
                sourceReference: '',
                status: 'available',
              },
              expiresAt: '2099-01-01T00:00:00Z',
            }),
            { status: 200 },
          );
        if (url.endsWith('/attempts'))
          return new Response(
            JSON.stringify({
              correct: true,
              feedback: 'Traffic from the right goes first.',
              ruleReference: 'RVV 1990, Article 15(1)',
              xpEarned: 15,
              outcome: 'right-first',
            }),
            { status: 200 },
          );
        return new Response(JSON.stringify(scenario), { status: 200 });
      });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/scenarios/right-priority']}>
          <Routes>
            <Route path="/scenarios/:scenarioId" element={<ScenarioPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/who should move first\?/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/wait for traffic from the right/i));
    fireEvent.click(screen.getByRole('button', { name: /commit decision/i }));

    expect(await screen.findByText(/correct! \+15 xp/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        '/api/v1/scenarios/right-priority/attempts',
        expect.objectContaining({
          method: 'POST',
          body: '{"answerIds":["yield-right"],"actionId":"yield-right"}',
        }),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(screen.queryByText(/correct! \+15 xp/i)).not.toBeInTheDocument();
  });
});
