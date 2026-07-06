export const DEFAULT_QUESTIONS = [
  {
    text: "Which programming language was created by Brendan Eich in 1995 in just 10 days?",
    options: {
      correct_answer: "JavaScript",
      distractors: ["Java", "Python", "C++"]
    },
    type: "MULTIPLE_CHOICE"
  },
  {
    text: "What does CSS stand for?",
    options: {
      correct_answer: "Cascading Style Sheets",
      distractors: ["Computer Style Sheets", "Creative Style Sheets", "Colorful Style Sheets"]
    },
    type: "MULTIPLE_CHOICE"
  },
  {
    text: "Sort these tech stack layers from front-end to back-end (client-side at the top, database at the bottom).",
    options: {
      correct_sequence: ["UI CSS / HTML", "React Client Logic", "Express API Router", "PostgreSQL Database"]
    },
    type: "SORTING"
  },
  {
    text: "Drag the correct hook names to complete the sentence.",
    options: {
      sentence: "In React, we use the [blank0] hook to manage local component state, and [blank1] to perform side effects.",
      answers_in_order: ["useState", "useEffect"],
      distractors: ["useContext", "useRef"]
    },
    type: "DRAG_DROP"
  },
  {
    text: "Select the correct technologies from the dropdowns to complete the statement.",
    options: {
      sentence: "PocketBase is written in {{0}} and uses {{1}} as its default embedded database engine.",
      dropdowns: [
        { correct_answer: "Go", distractors: ["Rust", "JavaScript"] },
        { correct_answer: "SQLite", distractors: ["PostgreSQL", "MongoDB"] }
      ]
    },
    type: "DROP_DOWN"
  },
  {
    text: "Classify these technologies into their correct category.",
    options: {
      categories: ["Languages", "Frameworks"],
      items: [
        { name: "JavaScript", category: "Languages" },
        { name: "React", category: "Frameworks" },
        { name: "Python", category: "Languages" },
        { name: "Next.js", category: "Frameworks" },
        { name: "SQL", category: "Languages" },
        { name: "Express", category: "Frameworks" }
      ]
    },
    type: "CATEGORIZE"
  }
];

export const SAMPLE_GAMES = [
  {
    title: "General Tech Trivia",
    description: "A fun quiz testing your knowledge of programming history, CSS, React, and general technology stack layers.",
    subject: "Technology",
    cefr_level: "B1",
    language: "English",
    creator: "System"
  },
  {
    title: "World Capitals Challenge",
    description: "Test your geography knowledge by identifying capital cities from around the world.",
    subject: "Geography",
    cefr_level: "A2",
    language: "English",
    creator: "System"
  },
  {
    title: "Basic Spanish Vocabulary",
    description: "Learn essential Spanish words and phrases for everyday conversations.",
    subject: "Foreign Languages",
    cefr_level: "A1",
    language: "Spanish",
    creator: "System"
  },
  {
    title: "Ancient History Quiz",
    description: "Explore the fascinating world of ancient civilizations from Egypt to Rome.",
    subject: "History",
    cefr_level: "B2",
    language: "English",
    creator: "System"
  },
  {
    title: "Math Fundamentals",
    description: "Practice basic arithmetic, algebra, and geometry concepts.",
    subject: "Math",
    cefr_level: "A2",
    language: "English",
    creator: "System"
  }
];

export const OPTION_CLASSES = [
  'option-card-red',
  'option-card-blue',
  'option-card-yellow',
  'option-card-green'
];

export const OPTION_SHAPES = [
  'shape-triangle',
  'shape-diamond',
  'shape-circle',
  'shape-square'
];

export const BUCKET_COLORS = [
  {
    background: 'linear-gradient(135deg, #FFD1D1 0%, #FFB7B2 100%)',
    border: '2px solid #FFA19B',
    color: '#7A3B3B',
    shadow: '0 4px 6px rgba(255, 183, 178, 0.2)'
  },
  {
    background: 'linear-gradient(135deg, #D4F0FC 0%, #B5E2FA 100%)',
    border: '2px solid #90CAF9',
    color: '#2C5E7A',
    shadow: '0 4px 6px rgba(181, 226, 250, 0.2)'
  },
  {
    background: 'linear-gradient(135deg, #D4FCDA 0%, #BFFCC6 100%)',
    border: '2px solid #81C784',
    color: '#2E6930',
    shadow: '0 4px 6px rgba(191, 252, 198, 0.2)'
  },
  {
    background: 'linear-gradient(135deg, #FFF5D1 0%, #FFE599 100%)',
    border: '2px solid #FFE082',
    color: '#705915',
    shadow: '0 4px 6px rgba(255, 229, 153, 0.2)'
  }
];

export const AVAILABLE_LANGUAGES = [
  'English',
  'Thai',
  'Spanish',
  'French',
  'German',
  'Chinese',
  'Japanese',
  'Korean',
  'Russian',
  'Other'
];

