import { request } from './client';
export interface Learner {
  id: string;
  email: string;
  displayName: string;
  preferredLanguage: string;
  role: 'learner' | 'admin';
}
export interface Progress {
  totalXp: number;
  level: { number: number; xpForNextLevel: number; xpIntoLevel: number };
  currentStreak: number;
  longestStreak: number;
  completedLessons: number;
  completedQuizzes: number;
  completedScenarios: number;
  badges: Array<{
    code: string;
    title: string;
    description: string;
    earned: boolean;
  }>;
}
export interface PathLesson {
  id: string;
  topicId: string;
  title: string;
  displayOrder: number;
  completed: boolean;
  unlocked: boolean;
  lockedReason?: string;
}
export const authAPI = {
  me: () => request<Learner>('/api/v1/auth/me'),
  progress: () => request<Progress>('/api/v1/users/me/progress'),
  learningPath: () =>
    request<{ lessons: PathLesson[] }>('/api/v1/learning-path').then(
      (r) => r.lessons,
    ),
  completeLesson: (id: string) =>
    request<Progress>(`/api/v1/lessons/${id}/complete`, { method: 'POST' }),
  login: (email: string, password: string) =>
    request<Learner>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (
    email: string,
    displayName: string,
    password: string,
    preferredLanguage = 'nl',
  ) =>
    request<Learner>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, displayName, password, preferredLanguage }),
    }),
  logout: () => request<void>('/api/v1/auth/logout', { method: 'POST' }),
  updateProfile: (displayName: string, preferredLanguage: 'nl' | 'en') => request<Learner>('/api/v1/auth/me', { method: 'PUT', body: JSON.stringify({ displayName, preferredLanguage }) }),
  changePassword: (currentPassword: string, newPassword: string) => request<void>('/api/v1/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  requestPasswordReset: (email: string) => request<{message:string;resetToken?:string}>('/api/v1/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) => request<void>('/api/v1/auth/password-reset/confirm', { method: 'POST', body: JSON.stringify({ token, password }) }),
  startLesson: (id: string) =>
    request<void>(`/api/v1/lessons/${id}/start`, { method: 'POST' }),
  saveLessonPosition: (id: string, position: string) =>
    request<void>(`/api/v1/lessons/${id}/position`, {
      method: 'PUT',
      body: JSON.stringify({ position }),
    }),
  lessonPosition: (id: string) =>
    request<{ position: string }>(`/api/v1/lessons/${id}/position`),
};
