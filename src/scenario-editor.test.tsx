import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { AdminScenario } from './api/admin';
import { ScenarioEditor } from './scenario-editor';

const initial: AdminScenario = {
  id: 'editor-test',
  title: 'Editor test',
  topicId: 'priority_rules',
  difficulty: 'easy',
  description: 'Example scenario description',
  mediaType: 'image',
  mediaId: '',
  questionText: 'Which action is safest?',
  questionType: 'single_select',
  options: [
    { id: 'a', text: 'Wait' },
    { id: 'b', text: 'Go' },
  ],
  correctAnswerIds: ['a'],
  explanation: 'You must yield.',
  examEligible: true,
  status: 'draft',
  version: 0,
  flaggedForReview: false,
};
function Harness() {
  const [value, setValue] = useState(initial);
  return (
    <>
      <output data-testid="state">
        {value.options?.length}:{value.correctAnswerIds?.join(',')}
      </output>
      <ScenarioEditor value={value} onChange={setValue} />
    </>
  );
}

describe('ScenarioEditor', () => {
  it('builds a media-based scenario without the old traffic editor', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    );
    expect(screen.getByLabelText(/scenario title/i)).toHaveValue('Editor test');
    expect(screen.getByLabelText(/question text/i)).toHaveValue(
      'Which action is safest?',
    );
    expect(screen.getByRole('button', { name: /add option/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /add road user/i }),
    ).not.toBeInTheDocument();
  });

  it('offers image, video and gif options in the media selector', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    );

    const mediaType = screen.getByLabelText(/media type/i);
    expect(screen.getByRole('option', { name: 'Static image' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Video' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Animated GIF' }),
    ).toBeInTheDocument();

    fireEvent.change(mediaType, { target: { value: 'video' } });
    expect((mediaType as HTMLSelectElement).value).toBe('video');

    fireEvent.change(mediaType, { target: { value: 'gif' } });
    expect((mediaType as HTMLSelectElement).value).toBe('gif');
  });
});
