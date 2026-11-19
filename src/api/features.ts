import { request } from './client';

export type FeatureKey =
  | 'learning_roadmap'
  | 'learner_dashboard'
  | 'practice_hub'
  | 'traffic_signs'
  | 'dashboard_symbols'
  | 'mock_exams'
  | 'scenarios'
  | 'global_search'
  | 'saved_items'
  | 'topic_checkpoints'
  | 'embedded_lesson_quizzes'
  | 'driving_school_finder'
  | 'account_settings';

export type FeatureValues = Record<FeatureKey, boolean>;

export const featureAPI = {
  list: () =>
    request<{ features: FeatureValues }>('/api/v1/features').then(
      (response) => response.features,
    ),
};

