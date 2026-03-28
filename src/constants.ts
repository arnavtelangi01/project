import { Question, Difficulty, Round } from './types';

export const QUESTIONS_BY_ROUND_AND_DIFFICULTY: Record<Round, Record<Difficulty, Question[]>> = {
  QUIZ: {
    EASY: [
      { id: 1, text: "What is the capital of France?", category: "General Knowledge" },
      { id: 2, text: "Who wrote 'Romeo and Juliet'?", category: "Literature" },
      { id: 3, text: "What is the largest planet in our solar system?", category: "Science" }
    ],
    MEDIUM: [
      { id: 4, text: "What is the chemical symbol for gold?", category: "Science" },
      { id: 5, text: "In which year did World War II end?", category: "History" },
      { id: 6, text: "What is the square root of 144?", category: "Math" }
    ],
    HARD: [
      { id: 7, text: "What is the smallest prime number greater than 100?", category: "Math" },
      { id: 8, text: "Who painted 'The Starry Night'?", category: "Art" },
      { id: 9, text: "What is the most abundant gas in Earth's atmosphere?", category: "Science" }
    ]
  },
  TECHNICAL: {
    EASY: [
      { id: 10, text: "Explain the difference between 'let' and 'const' in JavaScript.", category: "JavaScript" },
      { id: 11, text: "What is a responsive web design?", category: "Web Development" },
      { id: 12, text: "What does HTML stand for?", category: "Web Development" }
    ],
    MEDIUM: [
      { id: 13, text: "Describe the concept of 'closures' in JavaScript.", category: "JavaScript" },
      { id: 14, text: "What are the differences between SQL and NoSQL databases?", category: "Databases" },
      { id: 15, text: "How does a REST API work?", category: "Web Development" }
    ],
    HARD: [
      { id: 16, text: "Explain the 'this' keyword in different contexts in JavaScript.", category: "JavaScript" },
      { id: 17, text: "What is the time complexity of searching in a balanced binary search tree?", category: "Algorithms" },
      { id: 18, text: "How would you optimize a slow-performing web application?", category: "Performance" }
    ]
  },
  HR: {
    EASY: [
      { id: 19, text: "Tell me about yourself.", category: "Introduction" },
      { id: 20, text: "What are your strengths?", category: "Strengths" },
      { id: 21, text: "Why do you want to work here?", category: "Motivation" }
    ],
    MEDIUM: [
      { id: 22, text: "Describe a time you worked in a team to solve a problem.", category: "Teamwork" },
      { id: 23, text: "How do you handle stress and pressure?", category: "Soft Skills" },
      { id: 24, text: "What is your greatest professional achievement?", category: "Achievement" }
    ],
    HARD: [
      { id: 25, text: "Tell me about a time you failed and how you handled it.", category: "Resilience" },
      { id: 26, text: "How do you handle conflict with a coworker?", category: "Conflict Resolution" },
      { id: 27, text: "Where do you see yourself in five years?", category: "Future Goals" }
    ]
  }
};
