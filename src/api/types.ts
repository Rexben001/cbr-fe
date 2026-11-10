export type Difficulty = 'easy' | 'medium';

export interface Topic {
  id: string;
  slug: string;
  title: string;
  description: string;
  displayOrder: number;
}

export interface Lesson {
  id: string;
  topicId: string;
  slug: string;
  title: string;
  content: string;
  displayOrder: number;
  document: LessonDocument;
}
export interface EmbeddedLessonQuiz { id:string; lessonId:string; title:string; questions:Array<{id:string;text:string;type:'single_select'|'multi_select';options:AnswerOption[];explanation:string;mediaId?:string}> }
export interface EmbeddedLessonQuizResult { attemptId:string; totalQuestions:number; correctAnswers:number; feedback:Array<{questionId:string;correct:boolean;explanation:string;correctAnswerIds:string[]}> }
export interface LessonBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'animated' | 'callout' | 'scenario';
  content: Record<string, unknown>;
}
export interface LessonDocument {
  version: number;
  blocks: LessonBlock[];
}

export interface AnswerOption {
  id: string;
  text: string;
}
export interface QuestionView {
  id: string;
  topic: string;
  text: string;
  options: AnswerOption[];
  difficulty: Difficulty;
}
export interface AnswerResult {
  correct: boolean;
  xpEarned: number;
  explanation: string;
}
export interface QuizView {
  id: string;
  topicId: string;
  expiresAt: string;
  questions: QuestionView[];
}
export interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  percentageScore: number;
  xpEarned: number;
  feedback: Array<{
    questionId: string;
    correct: boolean;
    explanation?: string;
  }>;
}
export type ScenarioQuestionType = 'single_select' | 'multi_select';
export type ScenarioMediaType = 'image' | 'video' | 'gif';

export interface ScenarioMediaOption {
  id: string;
  text: string;
}

export interface Scenario {
  id: string;
  title: string;
  description?: string;
  topicId?: string;
  difficulty: Difficulty;
  mediaType?: ScenarioMediaType;
  mediaId?: string;
  questionText?: string;
  questionType?: ScenarioQuestionType;
  options?: ScenarioMediaOption[];
  correctAnswerIds?: string[];
  explanation?: string;
  examEligible?: boolean;
  contentReviewed?: boolean;
  // Backward-compatibility for older legacy payloads from the SVG-based scenario API.
  topic?: string;
  scene?: {
    mediaType?: ScenarioMediaType;
    mediaId?: string;
    description?: string;
    questionText?: string;
    questionType?: ScenarioQuestionType;
    options?: ScenarioMediaOption[];
    correctAnswerIds?: string[];
    explanation?: string;
    examEligible?: boolean;
  };
}
export interface ScenarioAttempt {
  correct: boolean;
  feedback: string;
  ruleReference: string;
  xpEarned: number;
  outcome: string;
}
export interface MediaAsset {
  id: string;
  kind: 'image' | 'video' | 'gif';
  url: string;
  altText: string;
  caption: string;
  transcript: string;
  sourceReference: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  posterMediaId?: string;
}
