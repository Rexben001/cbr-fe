import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExamPage } from './exam-pages';

const exam = {
  id: 'exam-1', status: 'in_progress', totalQuestions: 2, passingScore: 1,
  startedAt: '2026-11-12T12:00:00Z', expiresAt: '2099-11-12T12:30:00Z',
  questions: [
    { id: 'q1', topic: 'priority', text: 'Who goes first?', difficulty: 'easy', media: [], flagged: false, options: [{ id: 'a', text: 'Car A' }, { id: 'b', text: 'Car B' }] },
    { id: 'q2', topic: 'signs', text: 'What does the sign mean?', difficulty: 'easy', media: [], flagged: false, options: [{ id: 'a', text: 'Stop' }, { id: 'b', text: 'Go' }] },
  ],
};

function Location() { return <p>Location: {useLocation().pathname}</p>; }

describe('active mock exam navigation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(exam), { status: 200 }));
  });

  it('keeps branding non-clickable, centers the counter structure, and confirms exit', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/exams/exam-1']}><Routes><Route path="/exams/:id" element={<><ExamPage /><Location /></>} /><Route path="*" element={<Location />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText('Who goes first?')).toBeInTheDocument();
    expect(screen.getByLabelText(/rijfiks active exam/i).tagName).toBe('SPAN');
    expect(screen.getByText(/location: \/exams\/exam-1/i)).toBeInTheDocument();
    const counter = screen.getAllByText(/vraag/i).find((item) => item.closest('footer'));
    expect(counter).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /leave exam/i }));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByText(/location: \/exams\/exam-1/i)).toBeInTheDocument();
  });
});
