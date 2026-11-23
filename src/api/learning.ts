import { request } from './client';
import type {
  AnswerResult,
  PracticeAnalytics,
  PracticeQuestionSummary,
  QuestionReport,
  EmbeddedLessonQuiz,
  EmbeddedLessonQuizResult,
  Lesson,
  MediaAsset,
  QuestionView,
  QuizResult,
  QuizView,
  Scenario,
  ScenarioAttempt,
  Topic,
} from './types';

const normalizeScenario = (
  value: Partial<Scenario> & Record<string, unknown>,
): Scenario => {
  const scene = (value.scene as Scenario['scene']) ?? {};
  return {
    id: String(value.id ?? ''),
    title: String(value.title ?? ''),
    description: value.description ?? scene.description ?? '',
    topicId: String(value.topicId ?? value.topic ?? ''),
    difficulty: (value.difficulty as Scenario['difficulty']) ?? 'easy',
    mediaType: (value.mediaType ??
      scene.mediaType ??
      'image') as Scenario['mediaType'],
    mediaId: String(value.mediaId ?? scene.mediaId ?? ''),
    questionText: String(value.questionText ?? scene.questionText ?? ''),
    questionType: (value.questionType ??
      scene.questionType ??
      'single_select') as Scenario['questionType'],
    options: value.options ?? scene.options ?? [],
    correctAnswerIds: value.correctAnswerIds ?? scene.correctAnswerIds ?? [],
    explanation: value.explanation ?? scene.explanation ?? '',
    examEligible: Boolean(value.examEligible ?? scene.examEligible ?? false),
    contentReviewed: Boolean(value.contentReviewed ?? false),
    topic: value.topic ?? value.topicId ?? undefined,
    scene,
  };
};

export const learningAPI = {
  getQuestion: (id: string) => request<QuestionView>(`/api/v1/questions/${id}`),
  bookmarks: () =>
    request<{ bookmarks: PracticeQuestionSummary[] }>(
      '/api/v1/users/me/bookmarks',
    ).then((v) => v.bookmarks),
  toggleBookmark: (id: string) =>
    request<{ bookmarked: boolean }>(`/api/v1/questions/${id}/bookmark`, {
      method: 'POST',
    }),
  revision: () =>
    request<{ questions: PracticeQuestionSummary[] }>(
      '/api/v1/users/me/revision',
    ).then((v) => v.questions),
  practiceAnalytics: () =>
    request<PracticeAnalytics>('/api/v1/users/me/practice-analytics'),
  reportQuestion: (id: string, category: string, description: string) =>
    request<QuestionReport>(`/api/v1/questions/${id}/reports`, {
      method: 'POST',
      body: JSON.stringify({ category, description }),
    }),
  embeddedLessonQuiz: (lessonID: string, quizID: string) =>
    request<EmbeddedLessonQuiz>(
      `/api/v1/lessons/${lessonID}/embedded-quizzes/${quizID}`,
    ),
  submitEmbeddedLessonQuiz: (
    lessonID: string,
    quizID: string,
    answers: Array<{ questionId: string; answerIds: string[] }>,
  ) =>
    request<EmbeddedLessonQuizResult>(
      `/api/v1/lessons/${lessonID}/embedded-quizzes/${quizID}/attempts`,
      { method: 'POST', body: JSON.stringify({ answers }) },
    ),
  mediaAccess: (id: string) =>
    request<{ media: MediaAsset; expiresAt: string }>(
      `/api/v1/media/${id}/access`,
    ),
  contentMedia: (type: 'lesson' | 'question' | 'scenario', id: string) =>
    request<{ media: MediaAsset[] }>(
      `/api/v1/content-media/${type}/${id}`,
    ).then(({ media }) => media),
  listTopics: () =>
    request<{ topics: Topic[] }>('/api/v1/topics').then(({ topics }) => topics),
  listLessons: (topicID: string) =>
    request<{ lessons: Lesson[] }>(`/api/v1/topics/${topicID}/lessons`).then(
      ({ lessons }) => lessons,
    ),
  getLesson: (lessonID: string) =>
    request<Lesson>(`/api/v1/lessons/${lessonID}`),
  search: (query: string, topic = '') => request<{ results: import('./types').LearningSearchResult[] }>(`/api/v1/search?q=${encodeURIComponent(query)}&topic=${encodeURIComponent(topic)}`).then((value) => value.results),
  highlights: (lessonID = '') => request<{highlights: import('./types').LessonHighlight[]}>(lessonID ? `/api/v1/lessons/${lessonID}/highlights` : '/api/v1/users/me/highlights').then((value) => value.highlights),
  createHighlight: (lessonID: string, value: Omit<import('./types').LessonHighlight,'id'|'lessonId'|'lessonTitle'|'lessonVersion'|'currentLessonVersion'|'updatedAt'>) => request<import('./types').LessonHighlight>(`/api/v1/lessons/${lessonID}/highlights`,{method:'POST',body:JSON.stringify(value)}),
  updateHighlight: (id:string,color:string) => request<import('./types').LessonHighlight>(`/api/v1/highlights/${id}`,{method:'PUT',body:JSON.stringify({color})}),
  deleteHighlight: (id:string) => request<void>(`/api/v1/highlights/${id}`,{method:'DELETE'}),
  getQuestions: (topicID: string) =>
    request<{ questions: QuestionView[] }>(
      `/api/v1/topics/${topicID}/questions?limit=5`,
    ).then(({ questions }) => questions),
  getLessonQuestions: (lessonID: string) =>
    request<{ questions: QuestionView[] }>(
      `/api/v1/lessons/${lessonID}/practice-questions?limit=20`,
    ).then(({ questions }) => questions),
  answer: (questionId: string, answerId: string | string[], lessonId?: string) =>
    request<AnswerResult>('/api/v1/answers', {
      method: 'POST',
      body: JSON.stringify(
        Array.isArray(answerId)
          ? { questionId, answerIds: answerId, ...(lessonId ? { lessonId } : {}) }
          : { questionId, answerId, ...(lessonId ? { lessonId } : {}) },
      ),
    }),
  createQuiz: (topicId: string) =>
    request<QuizView>('/api/v1/quizzes', {
      method: 'POST',
      body: JSON.stringify({ topicId }),
    }),
  createCheckpoint: (topicId: string) =>
    request<QuizView>(`/api/v1/topics/${topicId}/checkpoint`, { method: 'POST' }),
  submitQuiz: (
    quizID: string,
    answers: Array<{ questionId: string; answerId: string }>,
  ) =>
    request<QuizResult>(`/api/v1/quizzes/${quizID}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
  listScenarios: () =>
    request<{ scenarios: Scenario[] }>('/api/v1/scenarios').then(
      ({ scenarios }) =>
        scenarios.map((scenario) =>
          normalizeScenario(scenario as Partial<Scenario>),
        ),
    ),
  getScenario: (id: string) =>
    request<Scenario>(`/api/v1/scenarios/${id}`).then((scenario) =>
      normalizeScenario(scenario as Partial<Scenario>),
    ),
  attemptScenario: (id: string, answerIds: string[]) =>
    request<ScenarioAttempt>(`/api/v1/scenarios/${id}/attempts`, {
      method: 'POST',
      body: JSON.stringify({ answerIds, actionId: answerIds[0] ?? '' }),
    }),
};
