export interface Question {
  id: number;
  text: string;
  category: string;
}

export interface Answer {
  questionId: number;
  text: string;
  score: number;
  feedback: string;
}

export type Round = 'QUIZ' | 'TECHNICAL' | 'HR';

export type AppState = 'AUTH' | 'START' | 'ROUND_SELECT' | 'DIFFICULTY_SELECT' | 'INTERVIEWING' | 'FINISHED' | 'PROFILE';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
