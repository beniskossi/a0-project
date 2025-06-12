import Dexie, { Table } from 'dexie';
import { DrawResult, PredictionResult } from '../types';

export interface StoredDrawResult extends DrawResult {
  categoryId: string;
}

export interface StoredPrediction extends PredictionResult {
  id: string;
  categoryId: string;
  drawDate: string;
  actualNumbers?: number[];
  accuracy?: number;
}

class LotoDatabase extends Dexie {
  drawResults!: Table<StoredDrawResult>;
  predictions!: Table<StoredPrediction>;
  
  constructor() {
    super('LotoAnalyzerDB');
    
    this.version(1).stores({
      drawResults: '++id, categoryId, date, draw_name',
      predictions: '++id, categoryId, drawDate, generatedAt, model',
    });
  }
}

export const db = new LotoDatabase();

export class IndexedDBService {
  // Résultats de tirages
  static async saveDrawResults(results: StoredDrawResult[]) {
    try {
      await db.drawResults.bulkPut(results);
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde IndexedDB:', error);
      return false;
    }
  }
  
  static async getDrawResults(categoryId?: string): Promise<StoredDrawResult[]> {
    try {
      if (categoryId) {
        return await db.drawResults.where('categoryId').equals(categoryId).toArray();
      }
      return await db.drawResults.toArray();
    } catch (error) {
      console.error('Erreur lecture IndexedDB:', error);
      return [];
    }
  }
  
  static async getLatestDrawResult(categoryId: string): Promise<StoredDrawResult | null> {
    try {
      const results = await db.drawResults
        .where('categoryId')
        .equals(categoryId)
        .reverse()
        .first();
      return results || null;
    } catch (error) {
      console.error('Erreur lecture dernière entrée:', error);
      return null;
    }
  }
  
  // Prédictions
  static async savePrediction(prediction: StoredPrediction) {
    try {
      await db.predictions.put(prediction);
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde prédiction:', error);
      return false;
    }
  }
  
  static async getPredictions(categoryId?: string): Promise<StoredPrediction[]> {
    try {
      if (categoryId) {
        return await db.predictions.where('categoryId').equals(categoryId).toArray();
      }
      return await db.predictions.toArray();
    } catch (error) {
      console.error('Erreur lecture prédictions:', error);
      return [];
    }
  }
  
  static async updatePredictionAccuracy(predictionId: string, actualNumbers: number[], accuracy: number) {
    try {
      await db.predictions.update(predictionId, { 
        actualNumbers, 
        accuracy 
      });
      return true;
    } catch (error) {
      console.error('Erreur mise à jour précision:', error);
      return false;
    }
  }
  
  // Statistiques
  static async getNumberFrequency(categoryId: string): Promise<Map<number, number>> {
    try {
      const results = await this.getDrawResults(categoryId);
      const frequency = new Map<number, number>();
      
      results.forEach(result => {
        result.gagnants.forEach(num => {
          frequency.set(num, (frequency.get(num) || 0) + 1);
        });
      });
      
      return frequency;
    } catch (error) {
      console.error('Erreur calcul fréquence:', error);
      return new Map();
    }
  }
  
  // Nettoyage
  static async clearOldData(daysToKeep: number = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffISO = cutoffDate.toISOString().split('T')[0];
      
      await db.drawResults.where('date').below(cutoffISO).delete();
      await db.predictions.where('drawDate').below(cutoffISO).delete();
      
      return true;
    } catch (error) {
      console.error('Erreur nettoyage données:', error);
      return false;
    }
  }
}