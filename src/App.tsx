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
import { DashboardPage, LoginPage, RegisterPage } from './auth-pages';
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

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/highlights" element={<HighlightsPage />} />
        <Route path="/roadmap" element={<RoadmapPage />} />
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
        <Route path="/exams" element={<ExamIntroPage />} />
        <Route path="/exams/:id" element={<ExamPage />} />
        <Route path="/exams/:id/results" element={<ExamResultsPage />} />
        <Route path="/exams/history" element={<ExamHistoryPage />} />
        <Route path="/scenarios" element={<ScenarioListPage />} />
        <Route path="/scenarios/:scenarioId" element={<ScenarioPage />} />
        <Route path="/topics/:topicId" element={<TopicPage />} />
        <Route path="/lessons/:lessonId" element={<LessonPage />} />
        <Route path="/topics/:topicId/practice" element={<PracticePage />} />
        <Route
          path="/practice/revision"
          element={<PracticeProgressPage mode="revision" />}
        />
        <Route
          path="/practice/bookmarks"
          element={<PracticeProgressPage mode="bookmarks" />}
        />
        <Route path="/topics/:topicId/quiz" element={<StartQuizPage />} />
        <Route path="/quizzes/:quizId" element={<QuizPage />} />
        <Route path="/quizzes/:quizId/results" element={<ResultsPage />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Shell>
  );
}
