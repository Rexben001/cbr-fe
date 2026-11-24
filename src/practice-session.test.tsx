import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuestionView } from './api/types';
import { PracticeSession } from './practice-session';

const questions: QuestionView[] = [
  {
    id: 'q1',
    topic: 'priority',
    text: 'Question one?',
    difficulty: 'easy',
    type: 'single_choice',
    options: [
      { id: 'a', text: 'First answer' },
      { id: 'b', text: 'Second answer' },
    ],
  },
  {
    id: 'q2',
    topic: 'priority',
    text: 'Question two?',
    difficulty: 'medium',
    type: 'single_choice',
    options: [
      { id: 'a', text: 'Third answer' },
      { id: 'b', text: 'Fourth answer' },
    ],
  },
];

function renderSession(
  props: Partial<ComponentProps<typeof PracticeSession>> = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PracticeSession
        questions={questions}
        storageKey="practice-test"
        heading="Priority practice"
        context={['Priority', 'Practice']}
        {...props}
      />
    </QueryClientProvider>,
  );
}

async function answerCurrent(optionName: string) {
  fireEvent.click(
    screen.getByRole('button', { name: new RegExp(optionName, 'i') }),
  );
  fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
  await screen.findByText(/correct — \+10 xp/i);
}

describe('PracticeSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).includes('/content-media/'))
        return new Response(JSON.stringify({ media: [] }), { status: 200 });
      if (String(input).includes('/api/v1/media/'))
        return new Response(JSON.stringify({ error: 'not found' }), {
          status: 404,
        });
      return new Response(
        JSON.stringify({
          correct: true,
          xpEarned: 10,
          explanation: 'Useful explanation.',
        }),
        { status: 200 },
      );
    });
  });

  it('moves to the next question without restarting or losing the first result', async () => {
    renderSession();
    await answerCurrent('First answer');
    fireEvent.click(screen.getByRole('button', { name: /next question/i }));
    expect(screen.getByText('Question two?')).toBeInTheDocument();
    expect(screen.getByText(/question 2 of 2/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(screen.getByText('Question one?')).toBeInTheDocument();
    expect(screen.getByText(/useful explanation/i)).toBeInTheDocument();
  });

  it('shows Finish Practice on the final question and then results', async () => {
    renderSession();
    await answerCurrent('First answer');
    fireEvent.click(screen.getByRole('button', { name: /next question/i }));
    await answerCurrent('Third answer');
    expect(
      screen.queryByRole('button', { name: /next question/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /finish practice/i }));
    expect(screen.getByText(/2 of 2 correct/i)).toBeInTheDocument();
  });

  it('clears the completed session when retrying', async () => {
    renderSession();
    await answerCurrent('First answer');
    fireEvent.click(screen.getByRole('button', { name: /next question/i }));
    await answerCurrent('Third answer');
    fireEvent.click(screen.getByRole('button', { name: /finish practice/i }));
    fireEvent.click(screen.getByRole('button', { name: /retry practice/i }));
    await waitFor(() =>
      expect(screen.getByText('Question one?')).toBeInTheDocument(),
    );
    expect(screen.queryByText(/useful explanation/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /check answer/i }),
    ).toBeDisabled();
  });

  it('passes at exactly 50 percent and records answers as lesson practice', async () => {
    const finished = vi.fn();
    vi.mocked(globalThis.fetch).mockImplementation(async (input, init) => {
      if (String(input).includes('/content-media/'))
        return new Response(JSON.stringify({ media: [] }), { status: 200 });
      if (String(input).includes('/api/v1/media/'))
        return new Response(JSON.stringify({ error: 'not found' }), {
          status: 404,
        });
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        questionId?: string;
      };
      return new Response(
        JSON.stringify({
          correct: body.questionId === 'q1',
          xpEarned: body.questionId === 'q1' ? 10 : 0,
          explanation: 'Useful explanation.',
        }),
        { status: 200 },
      );
    });
    renderSession({
      lessonId: 'lesson-1',
      passingPercentage: 50,
      onFinished: finished,
    });
    await answerCurrent('First answer');
    fireEvent.click(screen.getByRole('button', { name: /next question/i }));
    fireEvent.click(screen.getByRole('button', { name: /third answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));
    await screen.findByText(/not quite/i);
    fireEvent.click(screen.getByRole('button', { name: /finish practice/i }));
    expect(finished).toHaveBeenCalledWith({
      correct: 1,
      total: 2,
      percentage: 50,
      passed: true,
    });
    const answerRequests = vi
      .mocked(globalThis.fetch)
      .mock.calls.filter(([input]) =>
        String(input).endsWith('/api/v1/answers'),
      );
    expect(answerRequests).toHaveLength(2);
    expect(
      answerRequests.every(
        ([, init]) => JSON.parse(String(init?.body)).lessonId === 'lesson-1',
      ),
    ).toBe(true);
  });
});
