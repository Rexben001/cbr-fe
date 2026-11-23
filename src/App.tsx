import { Route, Routes } from 'react-router-dom';
import { Shell } from './components';
import {
  Dashboard,
  LessonPage,
  PracticePage,
  QuizPage,
  ResultsPage,
  StartQuizPage,
  TopicPage,
} from './pages';
import { ScenarioListPage, ScenarioPage } from './scenarios';
import { DashboardPage, ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage, VerifyEmailPage } from './auth-pages';
import {
  ExamHistoryPage,
  ExamIntroPage,
  ExamPage,
  ExamResultsPage,
} from './exam-pages';
import { AdminDashboardPage } from './admin-pages';
import { AdminTopicsPage } from './admin-topics';
import { AdminQuestionsPage, AdminScenariosPage } from './admin-content';
import { AdminLessonsPage } from './admin-lessons';
import {
  AdminRevisionsPage,
  AdminTopicRevisionsPage,
} from './admin-topic-revisions';
import { AdminMediaPage } from './admin-media';
import { PracticeProgressPage } from './practice-progress';
import { SearchPage } from './learner-search';
import { HighlightsPage } from './lesson-highlights';
import { RoadmapPage } from './learning-roadmap';
import { PracticeHubPage } from './practice-hub';
import { SettingsPage } from './settings';
import { DashboardSymbolsPage, TrafficSignsPage } from './traffic-signs';
import { FeatureRoute } from './feature-flags';
import { DrivingSchoolsPage } from './driving-schools';
import { AdminFeatureFlagsPage } from './admin-feature-flags';
import { AdminQuestionReportsPage } from './admin-question-reports';

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<FeatureRoute feature="learning_roadmap"><Dashboard /></FeatureRoute>} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/dashboard" element={<FeatureRoute feature="learner_dashboard"><DashboardPage /></FeatureRoute>} />
        <Route path="/search" element={<FeatureRoute feature="global_search"><SearchPage /></FeatureRoute>} />
        <Route path="/highlights" element={<FeatureRoute feature="saved_items"><HighlightsPage /></FeatureRoute>} />
        <Route path="/roadmap" element={<FeatureRoute feature="learning_roadmap"><RoadmapPage /></FeatureRoute>} />
        <Route path="/practice" element={<FeatureRoute feature="practice_hub"><PracticeHubPage /></FeatureRoute>} />
        <Route path="/settings" element={<FeatureRoute feature="account_settings"><SettingsPage /></FeatureRoute>} />
        <Route path="/traffic-signs" element={<FeatureRoute feature="traffic_signs"><TrafficSignsPage /></FeatureRoute>} />
        <Route path="/dashboard-symbols" element={<FeatureRoute feature="dashboard_symbols"><DashboardSymbolsPage /></FeatureRoute>} />
        <Route path="/driving-schools" element={<FeatureRoute feature="driving_school_finder"><DrivingSchoolsPage /></FeatureRoute>} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/topics" element={<AdminTopicsPage />} />
        <Route
          path="/admin/topics/:id/revisions"
          element={<AdminTopicRevisionsPage />}
        />
        <Route path="/admin/lessons" element={<AdminLessonsPage />} />
        <Route
          path="/admin/lessons/:id/revisions"
          element={
            <AdminRevisionsPage
              type="lessons"
              label="Lesson"
              backTo="/admin/lessons"
            />
          }
        />
        <Route path="/admin/questions" element={<AdminQuestionsPage />} />
        <Route
          path="/admin/questions/:id/revisions"
          element={
            <AdminRevisionsPage
              type="questions"
              label="Question"
              backTo="/admin/questions"
            />
          }
        />
        <Route path="/admin/scenarios" element={<AdminScenariosPage />} />
        <Route
          path="/admin/scenarios/:id/revisions"
          element={
            <AdminRevisionsPage
              type="scenarios"
              label="Scenario"
              backTo="/admin/scenarios"
            />
          }
        />
        <Route path="/admin/media" element={<AdminMediaPage />} />
        <Route path="/admin/feature-flags" element={<AdminFeatureFlagsPage />} />
        <Route path="/admin/reports" element={<AdminQuestionReportsPage />} />
        <Route path="/exams" element={<FeatureRoute feature="mock_exams"><ExamIntroPage /></FeatureRoute>} />
        <Route path="/exams/:id" element={<FeatureRoute feature="mock_exams"><ExamPage /></FeatureRoute>} />
        <Route path="/exams/:id/results" element={<FeatureRoute feature="mock_exams"><ExamResultsPage /></FeatureRoute>} />
        <Route path="/exams/history" element={<FeatureRoute feature="mock_exams"><ExamHistoryPage /></FeatureRoute>} />
        <Route path="/scenarios" element={<FeatureRoute feature="scenarios"><ScenarioListPage /></FeatureRoute>} />
        <Route path="/scenarios/:scenarioId" element={<FeatureRoute feature="scenarios"><ScenarioPage /></FeatureRoute>} />
        <Route path="/topics/:topicId" element={<FeatureRoute feature="learning_roadmap"><TopicPage /></FeatureRoute>} />
        <Route path="/lessons/:lessonId" element={<FeatureRoute feature="learning_roadmap"><LessonPage /></FeatureRoute>} />
        <Route path="/topics/:topicId/practice" element={<FeatureRoute feature="practice_hub"><PracticePage /></FeatureRoute>} />
        <Route
          path="/practice/revision"
          element={<FeatureRoute feature="practice_hub"><PracticeProgressPage mode="revision" /></FeatureRoute>}
        />
        <Route
          path="/practice/bookmarks"
          element={<FeatureRoute feature="saved_items"><PracticeProgressPage mode="bookmarks" /></FeatureRoute>}
        />
        <Route path="/topics/:topicId/quiz" element={<StartQuizPage />} />
        <Route path="/topics/:topicId/checkpoint" element={<FeatureRoute feature="topic_checkpoints"><StartQuizPage checkpoint /></FeatureRoute>} />
        <Route path="/quizzes/:quizId" element={<QuizPage />} />
        <Route path="/quizzes/:quizId/results" element={<ResultsPage />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Shell>
  );
}
