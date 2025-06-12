import { DrawSchedule, DrawCategory } from '../types';

export const DRAW_SCHEDULE: DrawSchedule = {
  Lundi: {
    '10H': 'Réveil',
    '13H': 'Étoile',
    '16H': 'Akwaba',
    '18H15': 'Monday Special',
  },
  Mardi: {
    '10H': 'La Matinale',
    '13H': 'Émergence',
    '16H': 'Sika',
    '18H15': 'Lucky Tuesday',
  },
  Mercredi: {
    '10H': 'Première Heure',
    '13H': 'Fortune',
    '16H': 'Baraka',
    '18H15': 'Midweek',
  },
  Jeudi: {
    '10H': 'Kado',
    '13H': 'Privilège',
    '16H': 'Monni',
    '18H15': 'Fortune Thursday',
  },
  Vendredi: {
    '10H': 'Cash',
    '13H': 'Solution',
    '16H': 'Wari',
    '18H15': 'Friday Bonanza',
  },
  Samedi: {
    '10H': 'Soutra',
    '13H': 'Diamant',
    '16H': 'Moaye',
    '18H15': 'National',
  },
  Dimanche: {
    '10H': 'Bénédiction',
    '13H': 'Prestige',
    '16H': 'Awalé',
    '18H15': 'Espoir',
  },
};

// Générer toutes les catégories de tirage
export const DRAW_CATEGORIES: DrawCategory[] = [];

Object.entries(DRAW_SCHEDULE).forEach(([dayName, times], dayIndex) => {
  Object.entries(times).forEach(([time, label]) => {
    const id = `${dayName.toLowerCase()}-${time.toLowerCase()}-${label.toLowerCase().replace(/\s+/g, '-')}`;
    DRAW_CATEGORIES.push({
      id,
      day: dayIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      dayName,
      time,
      label,
      fullName: `${dayName} ${time} - ${label}`,
    });
  });
});

// Couleurs pour les numéros selon les spécifications
export const NUMBER_COLORS = {
  '1-9': '#FFFFFF',     // Blanc
  '10-19': '#1E3A8A',   // Bleu foncé
  '20-29': '#166534',   // Vert foncé
  '30-39': '#4338CA',   // Indigo
  '40-49': '#CA8A04',   // Jaune foncé
  '50-59': '#EC4899',   // Rose
  '60-69': '#EA580C',   // Orange
  '70-79': '#6B7280',   // Gris
  '80-90': '#DC2626',   // Rouge
};

export const getNumberColor = (number: number): string => {
  if (number >= 1 && number <= 9) return NUMBER_COLORS['1-9'];
  if (number >= 10 && number <= 19) return NUMBER_COLORS['10-19'];
  if (number >= 20 && number <= 29) return NUMBER_COLORS['20-29'];
  if (number >= 30 && number <= 39) return NUMBER_COLORS['30-39'];
  if (number >= 40 && number <= 49) return NUMBER_COLORS['40-49'];
  if (number >= 50 && number <= 59) return NUMBER_COLORS['50-59'];
  if (number >= 60 && number <= 69) return NUMBER_COLORS['60-69'];
  if (number >= 70 && number <= 79) return NUMBER_COLORS['70-79'];
  if (number >= 80 && number <= 90) return NUMBER_COLORS['80-90'];
  return '#6B7280'; // Gris par défaut
};

export const getNumberTextColor = (number: number): string => {
  const bgColor = getNumberColor(number);
  // Retourne noir pour les couleurs claires, blanc pour les foncées
  const lightColors = ['#FFFFFF', '#CA8A04', '#EC4899', '#EA580C'];
  return lightColors.includes(bgColor) ? '#000000' : '#FFFFFF';
};