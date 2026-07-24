import seedGamesData from './data/seed-games.json';

export const SEED_GAMES = seedGamesData;
export const SAMPLE_GAMES = seedGamesData;
export const DEFAULT_QUESTIONS = seedGamesData[0]?.questions || [];

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

