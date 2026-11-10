import { beforeEach, describe, expect, it, vi } from 'vitest';
import { learningAPI } from './learning';

describe('learning API client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the topic endpoint and unwraps its response', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ topics: [{ id: 'priority' }] }), {
          status: 200,
        }),
      );
    await expect(learningAPI.listTopics()).resolves.toEqual([
      { id: 'priority' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/topics',
      expect.any(Object),
    );
  });

  it('sends an answer with the established request shape', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ correct: true, xpEarned: 10, explanation: 'Rule' }),
          { status: 200 },
        ),
      );
    await learningAPI.answer('q1', 'a1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/answers',
      expect.objectContaining({
        method: 'POST',
        body: '{"questionId":"q1","answerId":"a1"}',
      }),
    );
  });
});
