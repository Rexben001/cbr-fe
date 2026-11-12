import { APIError, apiBaseURL, request } from './client';

export interface AdminDashboard {
  topics: number;
  lessons: number;
  questions: number;
  scenarios: number;
  published: number;
  draft: number;
  inReview: number;
  flagged: number;
  learners: number;
  dailyActive: number;
  monthlyActive: number;
  completedQuizzes: number;
  completedExams: number;
  examPassRate: number;
}
export type ContentStatus = 'draft' | 'in_review' | 'published' | 'archived';
export interface AdminTopic {
  id: string;
  slug: string;
  titleNl: string;
  titleEn: string;
  descriptionNl: string;
  descriptionEn: string;
  displayOrder: number;
  status: ContentStatus;
  version: number;
  sourceReference: string;
  flaggedForReview: boolean;
}
export interface LessonBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'animated' | 'callout' | 'scenario';
  content: Record<string, unknown>;
}
export interface LessonDocument {
  version: 1;
  blocks: LessonBlock[];
}
export interface AdminLesson {
  id: string;
  topicId: string;
  slug: string;
  title: string;
  content: string;
  document: LessonDocument;
  displayOrder: number;
  prerequisiteIds: string[];
  status: ContentStatus;
  version: number;
  sourceReference: string;
  flaggedForReview: boolean;
}
export interface AdminQuestion {
  id: string;
  topicId: string;
  text: string;
  difficulty: 'easy' | 'medium';
  type: 'single_choice' | 'multiple_choice';
  options: Array<{ id: string; text: string }>;
  correctAnswerId?: string;
  correctAnswerIds?: string[];
  explanationNl: string;
  explanationEn: string;
  status: ContentStatus;
  version: number;
  sourceReference: string;
  flaggedForReview: boolean;
}
export type ScenarioQuestionType = 'single_select' | 'multi_select';
export type ScenarioMediaType = 'image' | 'video' | 'gif';

export interface AdminScenario {
  id: string;
  title: string;
  topicId: string;
  difficulty: 'easy' | 'medium';
  description?: string;
  mediaType?: ScenarioMediaType;
  mediaId?: string;
  questionText?: string;
  questionType?: ScenarioQuestionType;
  options?: Array<{ id: string; text: string }>;
  correctAnswerIds?: string[];
  explanation?: string;
  examEligible?: boolean;
  status: ContentStatus;
  version: number;
  flaggedForReview: boolean;
}
export interface Revision {
  version: number;
  snapshot: unknown;
  changedAt: string;
  changedBy?: string;
}
export interface MediaAsset {
  id: string;
  kind: 'image' | 'video' | 'gif';
  url: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  altText: string;
  caption: string;
  transcript: string;
  language: string;
  sourceReference: string;
  status: 'processing' | 'available' | 'archived' | 'failed';
  width?: number;
  height?: number;
  durationSeconds?: number;
  posterMediaId?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}
export type ContentType = 'topics' | 'lessons' | 'questions' | 'scenarios';
export type MediaContentType = 'lesson' | 'question' | 'scenario';
export type ContentAction = 'submit-review' | 'publish' | 'archive';
export interface AdminListOptions {
  limit?: number;
  offset?: number;
  status?: ContentStatus | '';
  topic?: string;
  search?: string;
}
export interface MediaUploadMetadata {
  altText: string;
  caption: string;
  transcript: string;
  language: string;
  sourceReference: string;
}
export interface AdminLessonQuiz {
  id: string;
  lessonId: string;
  title: string;
  questions: Array<{
    id: string;
    text: string;
    type: 'single_select' | 'multi_select';
    options: Array<{ id: string; text: string; correct: boolean }>;
    explanation: string;
    mediaId?: string;
    sourceQuestionId?: string;
  }>;
}
export interface AdminLessonQuizRevision {
  version: number;
  quiz: AdminLessonQuiz;
  createdAt: string;
}

function uploadMedia(
  file: File,
  metadata: MediaUploadMetadata,
  onProgress?: (percent: number) => void,
): Promise<MediaAsset> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('altText', metadata.altText);
    form.append('caption', metadata.caption);
    form.append('transcript', metadata.transcript);
    form.append('language', metadata.language);
    form.append('sourceReference', metadata.sourceReference);
    form.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiBaseURL}/api/v1/admin/media`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress?.(Math.round((event.loaded * 100) / event.total));
    };
    xhr.onerror = () => reject(new APIError('Media upload failed.', 0));
    xhr.onload = () => {
      let body: { error?: string } & Partial<MediaAsset> = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* empty response */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as MediaAsset);
      else
        reject(new APIError(body.error ?? 'Media upload failed.', xhr.status));
    };
    xhr.send(form);
  });
}

const transition = (
  type: ContentType,
  id: string,
  action: ContentAction,
  version: number,
) =>
  request<void>(`/api/v1/admin/${type}/${id}/${action}`, {
    method: 'POST',
    body: JSON.stringify({ version }),
  });

export const adminAPI = {
  lessonQuiz: (id: string) =>
    request<AdminLessonQuiz>(`/api/v1/admin/lesson-quizzes/${id}`),
  saveLessonQuiz: (value: AdminLessonQuiz) =>
    request<AdminLessonQuiz>(`/api/v1/admin/lesson-quizzes/${value.id}`, {
      method: 'PUT',
      body: JSON.stringify(value),
    }),
  lessonQuizRevisions: (id: string) =>
    request<{ revisions: AdminLessonQuizRevision[] }>(
      `/api/v1/admin/lesson-quizzes/${id}/revisions`,
    ).then((v) => v.revisions),
  restoreLessonQuiz: (id: string, version: number) =>
    request<AdminLessonQuiz>(`/api/v1/admin/lesson-quizzes/${id}/restore`, {
      method: 'PUT',
      body: JSON.stringify({ version }),
    }),
  dashboard: () => request<AdminDashboard>('/api/v1/admin/dashboard'),
  media: (
    options: { search?: string; kind?: string; status?: string } = {},
  ) => {
    const query = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    return request<{ media: MediaAsset[] }>(
      `/api/v1/admin/media${query.size ? `?${query}` : ''}`,
    );
  },
  uploadMedia,
  getMedia: (id: string) => request<MediaAsset>(`/api/v1/admin/media/${id}`),
  updateMedia: (asset: MediaAsset) =>
    request<MediaAsset>(`/api/v1/admin/media/${asset.id}`, {
      method: 'PATCH',
      body: JSON.stringify(asset),
    }),
  archiveMedia: (id: string) =>
    request<void>(`/api/v1/admin/media/${id}/archive`, { method: 'POST' }),
  contentMedia: (type: MediaContentType, id: string) =>
    request<{ media: MediaAsset[] }>(`/api/v1/admin/media-links/${type}/${id}`),
  setContentMedia: (type: MediaContentType, id: string, ids: string[]) =>
    request<void>(`/api/v1/admin/media-links/${type}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    }),
  topics: () => request<{ topics: AdminTopic[] }>('/api/v1/admin/topics'),
  listTopics: (options: AdminListOptions = {}) =>
    request<{ topics: AdminTopic[] }>(`/api/v1/admin/topics${adminListQuery(options)}`),
  createTopic: (value: AdminTopic) =>
    request<AdminTopic>('/api/v1/admin/topics', {
      method: 'POST',
      body: JSON.stringify(value),
    }),
  updateTopic: (value: AdminTopic) =>
    request<AdminTopic>(`/api/v1/admin/topics/${value.id}`, {
      method: 'PATCH',
      body: JSON.stringify(value),
    }),
  transitionTopic: (id: string, action: ContentAction, version: number) =>
    transition('topics', id, action, version),
  transition,
  revisions: (type: ContentType, id: string) =>
    request<{ revisions: Revision[] }>(`/api/v1/admin/${type}/${id}/revisions`),
  lessons: () => request<{ lessons: AdminLesson[] }>('/api/v1/admin/lessons'),
  listLessons: (options: AdminListOptions = {}) =>
    request<{ lessons: AdminLesson[] }>(`/api/v1/admin/lessons${adminListQuery(options)}`),
  createLesson: (value: AdminLesson) =>
    request<AdminLesson>('/api/v1/admin/lessons', {
      method: 'POST',
      body: JSON.stringify(value),
    }),
  updateLesson: (value: AdminLesson) =>
    request<AdminLesson>(`/api/v1/admin/lessons/${value.id}`, {
      method: 'PATCH',
      body: JSON.stringify(value),
    }),
  lessonPracticeQuestions: (lessonID: string) => request<{ ids: string[] }>(`/api/v1/admin/lessons/${lessonID}/practice-questions`).then((value) => value.ids),
  setLessonPracticeQuestions: (lessonID: string, ids: string[]) => request<void>(`/api/v1/admin/lessons/${lessonID}/practice-questions`, { method: 'PUT', body: JSON.stringify({ ids }) }),
  questions: () => request<{ questions: AdminQuestion[] }>('/api/v1/admin/questions'),
  listQuestions: (options: AdminListOptions = {}) =>
    request<{ questions: AdminQuestion[] }>(`/api/v1/admin/questions${adminListQuery(options)}`),
  createQuestion: (value: AdminQuestion) =>
    request<AdminQuestion>('/api/v1/admin/questions', {
      method: 'POST',
      body: JSON.stringify(value),
    }),
  updateQuestion: (value: AdminQuestion) =>
    request<AdminQuestion>(`/api/v1/admin/questions/${value.id}`, {
      method: 'PATCH',
      body: JSON.stringify(value),
    }),
  scenarios: () => request<{ scenarios: AdminScenario[] }>('/api/v1/admin/scenarios'),
  listScenarios: (options: AdminListOptions = {}) =>
    request<{ scenarios: AdminScenario[] }>(`/api/v1/admin/scenarios${adminListQuery(options)}`),
  createScenario: (value: AdminScenario) =>
    request<AdminScenario>('/api/v1/admin/scenarios', {
      method: 'POST',
      body: JSON.stringify(value),
    }),
  updateScenario: (value: AdminScenario) =>
    request<AdminScenario>(`/api/v1/admin/scenarios/${value.id}`, {
      method: 'PATCH',
      body: JSON.stringify(value),
    }),
};

function adminListQuery(options: AdminListOptions) {
  const query = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.size ? `?${query}` : '';
}
