import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LearnerDashboard } from './learner-dashboard';

describe('LearnerDashboard', () => {
  it('shows concise real metrics, friendly names, formatted statuses, and no misleading empty percentages', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) return json({ id: 'u1', email: 'sam@example.test', displayName: 'Sam', preferredLanguage: 'en', role: 'learner' });
      if (url.endsWith('/users/me/progress')) return json({ totalXp: 120, level: { number: 2, xpForNextLevel: 250, xpIntoLevel: 20 }, currentStreak: 2, longestStreak: 5, completedLessons: 1, completedQuizzes: 0, completedScenarios: 0, badges: [] });
      if (url.endsWith('/users/me/practice-analytics')) return json({ totalAttempts: 0, correctAttempts: 0, incorrectAttempts: 0, overallAccuracy: 0, distinctQuestions: 0, incorrectQuestions: 0, improvedQuestions: 0, topics: [{ topic: 'm06', attempts: 0, correct: 0, incorrect: 0, accuracy: 0, needsPractice: 0 }] });
      if (url.endsWith('/learning-path')) return json({ lessons: [{ id: 'l1', topicId: 'm06', title: 'Safe following distance', displayOrder: 0, completed: false, unlocked: true }] });
      if (url.endsWith('/topics')) return json({ topics: [{ id: 'm06', slug: 'speed', title: 'Speed and distance', description: '', displayOrder: 0 }] });
      if (url.endsWith('/users/me/exams')) return json({ attempts: [{ id: 'exam-1', status: 'in_progress', startedAt: '2026-11-12T12:00:00Z', percentage: 0, passed: false }] });
      if (url.endsWith('/users/me/exam-performance')) return json({ totalCompleted: 0, passed: 0, failed: 0, passRate: 0, averageScore: 0, recent: [] });
      return json({}, 404);
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><LearnerDashboard /></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByRole('heading', { name: 'Safe following distance' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /continue learning/i })).toHaveAttribute('href', '/lessons/l1');
    const metrics = screen.getByLabelText(/primary progress metrics/i);
    expect(within(metrics).getByText('No attempts yet')).toBeInTheDocument();
    expect(within(metrics).getByText('None yet')).toBeInTheDocument();
    expect(within(metrics).queryByText('0%')).not.toBeInTheDocument();
    expect(screen.getAllByText('Speed and distance').length).toBeGreaterThan(0);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /full roadmap/i })).toHaveAttribute('href', '/roadmap');
    expect(screen.queryByText(/lessons by topic/i)).not.toBeInTheDocument();
  });
});

function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status }); }
