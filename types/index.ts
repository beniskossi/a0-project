// Types principaux de l'application
export interface DrawSchedule {
  [day: string]: { [time: string]: string };
}

export interface DrawResult {
  id: string;
  draw_name: string;
  date: string;
  gagnants: number[];
  machine?: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DrawCategory {
  id: string;
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Lundi, 6 = Dimanche
  dayName: string;
  time: string;
  label: string;
  fullName: string;
}

export interface NumberFrequency {
  number: number;
  count: number;
  percentage: number;
  lastSeen?: string;
  gap?: number; // écart depuis dernière apparition
}

export interface PredictionResult {
  numbers: number[];
  confidence: number;
  model: 'xgboost' | 'lstm' | 'random_forest' | 'hybrid';
  generatedAt: string;
}

export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
  mode: ThemeMode;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
}