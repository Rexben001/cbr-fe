import { request } from './client';

export type FlashcardStatus = 'new' | 'known' | 'needs_practice';
export interface FlashcardProgress {
  deck: 'traffic_signs' | 'dashboard_symbols';
  assetId: string;
  status: FlashcardStatus;
  bookmarked: boolean;
  studiedCount: number;
  quizAttempts: number;
  quizCorrect: number;
  lastStudiedAt?: string;
  updatedAt: string;
}
export interface FlashcardProgressUpdate {
  status?: FlashcardStatus;
  bookmarked?: boolean;
  studied?: boolean;
  quizCorrect?: boolean;
}

export const flashcardsAPI = {
  progress: (deck: FlashcardProgress['deck']) =>
    request<{ progress: FlashcardProgress[] }>(`/api/v1/users/me/flashcards/${deck}`).then(value => value.progress),
  update: (deck: FlashcardProgress['deck'], assetId: string, update: FlashcardProgressUpdate) =>
    request<FlashcardProgress>(`/api/v1/users/me/flashcards/${deck}/${assetId}`, {
      method: 'PUT', body: JSON.stringify(update),
    }),
};
