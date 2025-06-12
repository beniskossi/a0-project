import axios, { AxiosResponse } from 'axios';
import { parse } from 'date-fns';
import { DrawResult } from '../types';
import { DRAW_SCHEDULE } from '../constants/drawSchedule';

interface APIDrawResult {
  draw_name: string;
  date: string;
  gagnants: number[];
  machine?: number[];
}

interface LotteryAPIResponse {
  success: boolean;
  drawsResultsWeekly: Array<{
    drawResultsDaily: Array<{
      date: string;
      drawResults: {
        standardDraws: Array<{
          drawName: string;
          winningNumbers: string;
          machineNumbers?: string;
        }>;
      };
    }>;
  }>;
}

export class WebScrapingService {
  private static readonly BASE_URL = 'https://lotobonheur.ci/api/results';
  private static readonly HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Referer': 'https://lotobonheur.ci/resultats',
  };

  static async fetchLotteryResults(month?: string): Promise<DrawResult[]> {
    try {
      const url = month ? `${this.BASE_URL}?month=${month}` : this.BASE_URL;
      
      const response: AxiosResponse<LotteryAPIResponse> = await axios.get(url, {
        headers: this.HEADERS,
        timeout: 15000,
      });

      if (!response.data.success) {
        throw new Error('Réponse API non réussie');
      }

      return this.parseAPIResponse(response.data);
    } catch (error) {
      console.error('Erreur web scraping:', error);
      
      // Fallback avec données de test si API indisponible
      if (process.env.NODE_ENV === 'development') {
        return this.generateMockData();
      }
      
      throw error;
    }
  }

  private static parseAPIResponse(data: LotteryAPIResponse): DrawResult[] {
    const validDrawNames = new Set();
    Object.values(DRAW_SCHEDULE).forEach((day) => {
      Object.values(day).forEach((drawName) => validDrawNames.add(drawName));
    });

    const results: DrawResult[] = [];

    for (const week of data.drawsResultsWeekly) {
      for (const dailyResult of week.drawResultsDaily) {
        const dateStr = dailyResult.date;
        let drawDate: string;

        try {
          const [, dayMonth] = dateStr.split(' ');
          const [day, month] = dayMonth.split('/');
          const parsedDate = parse(`${day}/${month}/2025`, 'dd/MM/yyyy', new Date());
          drawDate = parsedDate.toISOString().split('T')[0];
        } catch (e) {
          console.warn(`Format de date invalide : ${dateStr}`);
          continue;
        }

        for (const draw of dailyResult.drawResults.standardDraws) {
          const drawName = draw.drawName;
          
          if (!validDrawNames.has(drawName) || draw.winningNumbers.startsWith('.')) {
            continue;
          }

          const winningNumbers = (draw.winningNumbers.match(/\d+/g) || [])
            .map(Number)
            .filter(n => n >= 1 && n <= 90)
            .slice(0, 5);
            
          const machineNumbers = (draw.machineNumbers?.match(/\d+/g) || [])
            .map(Number)
            .filter(n => n >= 1 && n <= 90)
            .slice(0, 5);

          if (winningNumbers.length === 5) {
            results.push({
              id: `${drawName}-${drawDate}`,
              draw_name: drawName,
              date: drawDate,
              gagnants: winningNumbers.sort((a, b) => a - b),
              machine: machineNumbers.length === 5 ? machineNumbers.sort((a, b) => a - b) : undefined,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    return results;
  }

  private static generateMockData(): DrawResult[] {
    const results: DrawResult[] = [];
    const today = new Date();
    
    // Générer 30 jours de données de test
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      Object.values(DRAW_SCHEDULE).forEach((daySchedule) => {
        Object.values(daySchedule).forEach((drawName) => {
          const winningNumbers = this.generateRandomNumbers();
          const machineNumbers = this.generateRandomNumbers();
          
          results.push({
            id: `${drawName}-${dateStr}`,
            draw_name: drawName,
            date: dateStr,
            gagnants: winningNumbers,
            machine: machineNumbers,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        });
      });
    }
    
    return results;
  }

  private static generateRandomNumbers(): number[] {
    const numbers = new Set<number>();
    while (numbers.size < 5) {
      numbers.add(Math.floor(Math.random() * 90) + 1);
    }
    return Array.from(numbers).sort((a, b) => a - b);
  }

  static async fetchLatestResults(): Promise<DrawResult[]> {
    return this.fetchLotteryResults();
  }

  static async fetchResultsForMonth(year: number, month: number): Promise<DrawResult[]> {
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    return this.fetchLotteryResults(monthStr);
  }
}