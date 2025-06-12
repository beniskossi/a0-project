import { toast } from 'sonner-native';
import { supabase, DrawResultDB, PredictionDB } from './supabaseClient';
import { IndexedDBService, StoredDrawResult, StoredPrediction } from './indexedDBService';
import { WebScrapingService } from './webScrapingService';
import { DrawResult, PredictionResult } from '../types';
import { DRAW_CATEGORIES } from '../constants/drawSchedule';

export class DataService {
  // Synchronisation des données
  static async syncData(): Promise<boolean> {
    try {
      toast.info('Synchronisation en cours...');
      
      // 1. Récupérer les nouvelles données via web scraping
      const scrapedResults = await WebScrapingService.fetchLatestResults();
      
      // 2. Convertir et sauvegarder dans IndexedDB
      const storedResults: StoredDrawResult[] = scrapedResults.map(result => ({
        ...result,
        categoryId: this.getCategoryIdFromDrawName(result.draw_name),
      }));
      
      await IndexedDBService.saveDrawResults(storedResults);
      
      // 3. Synchroniser avec Supabase (si disponible)
      await this.syncToSupabase(scrapedResults);
      
      toast.success(`${scrapedResults.length} résultats synchronisés`);
      return true;
    } catch (error) {
      console.error('Erreur synchronisation:', error);
      toast.error('Erreur lors de la synchronisation');
      return false;
    }
  }
  
  // Récupérer les données (offline-first)
  static async getDrawResults(categoryId?: string): Promise<StoredDrawResult[]> {
    try {
      // Priorité aux données locales (IndexedDB)
      let results = await IndexedDBService.getDrawResults(categoryId);
      
      // Si pas de données locales, essayer Supabase
      if (results.length === 0) {
        const supabaseResults = await this.getFromSupabase(categoryId);
        if (supabaseResults.length > 0) {
          await IndexedDBService.saveDrawResults(supabaseResults);
          results = supabaseResults;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Erreur récupération données:', error);
      return [];
    }
  }
  
  // Sauvegarder prédiction
  static async savePrediction(prediction: PredictionResult, categoryId: string, drawDate: string): Promise<boolean> {
    try {
      const storedPrediction: StoredPrediction = {
        ...prediction,
        id: `${categoryId}-${Date.now()}`,
        categoryId,
        drawDate,
      };
      
      const success = await IndexedDBService.savePrediction(storedPrediction);
      
      if (success) {
        // Aussi sauvegarder sur Supabase
        await this.savePredictionToSupabase(storedPrediction);
      }
      
      return success;
    } catch (error) {
      console.error('Erreur sauvegarde prédiction:', error);
      return false;
    }
  }
  
  // Mettre à jour la précision d'une prédiction
  static async updatePredictionAccuracy(predictionId: string, actualNumbers: number[]): Promise<boolean> {
    try {
      const predictions = await IndexedDBService.getPredictions();
      const prediction = predictions.find(p => p.id === predictionId);
      
      if (!prediction) return false;
      
      const accuracy = this.calculateAccuracy(prediction.numbers, actualNumbers);
      
      return await IndexedDBService.updatePredictionAccuracy(predictionId, actualNumbers, accuracy);
    } catch (error) {
      console.error('Erreur mise à jour précision:', error);
      return false;
    }
  }
  
  // Calculer la précision d'une prédiction
  private static calculateAccuracy(predicted: number[], actual: number[]): number {
    const intersection = predicted.filter(num => actual.includes(num));
    return (intersection.length / 5) * 100; // Pourcentage de numéros corrects
  }
  
  // Obtenir l'ID de catégorie depuis le nom du tirage
  private static getCategoryIdFromDrawName(drawName: string): string {
    const category = DRAW_CATEGORIES.find(cat => cat.label === drawName);
    return category?.id || 'unknown';
  }
  
  // Synchronisation avec Supabase
  private static async syncToSupabase(results: DrawResult[]): Promise<void> {
    try {
      const dbResults: DrawResultDB[] = results.map(result => ({
        id: result.id,
        category_id: this.getCategoryIdFromDrawName(result.draw_name),
        draw_name: result.draw_name,
        date: result.date,
        gagnants: result.gagnants,
        machine: result.machine,
        created_at: result.createdAt || new Date().toISOString(),
        updated_at: result.updatedAt || new Date().toISOString(),
      }));
      
      const { error } = await supabase
        .from('draw_results')
        .upsert(dbResults, { onConflict: 'id' });
        
      if (error) {
        console.warn('Erreur sync Supabase:', error);
      }
    } catch (error) {
      console.warn('Supabase non disponible:', error);
    }
  }
  
  private static async getFromSupabase(categoryId?: string): Promise<StoredDrawResult[]> {
    try {
      let query = supabase.from('draw_results').select('*');
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        categoryId: item.category_id,
        draw_name: item.draw_name,
        date: item.date,
        gagnants: item.gagnants,
        machine: item.machine,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
    } catch (error) {
      console.warn('Erreur lecture Supabase:', error);
      return [];
    }
  }
  
  private static async savePredictionToSupabase(prediction: StoredPrediction): Promise<void> {
    try {
      const dbPrediction: PredictionDB = {
        id: prediction.id,
        category_id: prediction.categoryId,
        predicted_numbers: prediction.numbers,
        actual_numbers: prediction.actualNumbers,
        confidence: prediction.confidence,
        model_type: prediction.model,
        accuracy: prediction.accuracy,
        created_at: prediction.generatedAt,
        draw_date: prediction.drawDate,
      };
      
      const { error } = await supabase
        .from('predictions')
        .upsert(dbPrediction, { onConflict: 'id' });
        
      if (error) {
        console.warn('Erreur sauvegarde prédiction Supabase:', error);
      }
    } catch (error) {
      console.warn('Supabase non disponible pour prédictions:', error);
    }
  }
  
  // Statistiques
  static async getNumberFrequency(categoryId: string): Promise<Map<number, number>> {
    return await IndexedDBService.getNumberFrequency(categoryId);
  }
  
  // Nettoyage automatique
  static async cleanup(): Promise<void> {
    await IndexedDBService.clearOldData(365); // Garder 1 an de données
  }
}