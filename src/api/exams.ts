import { request } from './client';
import type { AnswerOption, Difficulty } from './types';
export interface ExamMedia {
  id: string;
  kind: 'image' | 'video' | 'gif';
  altText: string;
  caption: string;
  transcript: string;
}
export interface ExamQuestion {
  id: string;
  topic: string;
  text: string;
  options: AnswerOption[];
  difficulty: Difficulty;
  media: ExamMedia[];
  selectedAnswerId?: string;
  flagged: boolean;
}
export interface Exam {
  id: string;
  status: 'in_progress' | 'completed' | 'expired';
  totalQuestions: number;
  passingScore: number;
  startedAt: string;
  expiresAt: string;
  questions: ExamQuestion[];
}
export interface ExamResult {
  id: string;
  status: string;
  correctAnswers: number;
  incorrectAnswers: number;
  unanswered: number;
  percentage: number;
  passed: boolean;
  questions: Array<{
    question: ExamQuestion;
    selectedAnswerId: string;
    correctAnswerId: string;
    explanation: string;
    correct: boolean;
  }>;
}
export interface ExamHistoryItem {
  id: string;
  status: 'in_progress' | 'completed' | 'expired';
  startedAt: string;
  completedAt?: string;
  percentage: number;
  passed: boolean;
}
export interface ExamPerformance {
  totalCompleted: number;
  passed: number;
  failed: number;
  passRate: number;
  averageScore: number;
  recent: ExamHistoryItem[];
}
export const examsAPI = {
  start: () => request<Exam>('/api/v1/exams', { method: 'POST' }),
  active: () => request<Exam>('/api/v1/exams/active'),
  get: (id: string) => request<Exam>(`/api/v1/exams/${id}`),
  result: (id: string) => request<ExamResult>(`/api/v1/exams/${id}/result`),
  answer: (examID: string, questionID: string, answerId: string) =>
    request<Exam>(`/api/v1/exams/${examID}/answers/${questionID}`, {
      method: 'PUT',
      body: JSON.stringify({ answerId }),
    }),
  flag: (examID: string, questionID: string, flagged: boolean) =>
    request<Exam>(`/api/v1/exams/${examID}/flags/${questionID}`, { method: 'PUT', body: JSON.stringify({ flagged }) }),
  submit: (id: string) =>
    request<ExamResult>(`/api/v1/exams/${id}/submit`, { method: 'POST' }),
  history: () =>
    request<{ attempts: ExamHistoryItem[] }>('/api/v1/users/me/exams').then(
      (v) => v.attempts,
    ),
  performance: () =>
    request<ExamPerformance>('/api/v1/users/me/exam-performance'),
};
