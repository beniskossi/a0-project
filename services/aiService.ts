import { toast } from 'sonner-native';
import { DataService } from './dataService';
import { XGBoostService } from './xgboostService';
import { RandomForestService } from './randomForestService';
import { LSTMService } from './lstmService';
import { HybridPredictor } from './hybridPredictor';
import { PredictionResult } from '../types';
import { StoredDrawResult } from './indexedDBService';

export interface PredictionConfig {
  model: 'xgboost' | 'random_forest' | 'lstm' | 'hybrid';
  confidence_threshold: number;
  lookback_days: number;
  include_machine_numbers: boolean;
  weight_recent: boolean;
}

export interface ModelPerformance {
  model: string;
  total_predictions: number;
  correct_predictions: number;
  accuracy: number;
  confidence_avg: number;
  last_updated: string;
}

export class AIService {
  private static xgboost = new XGBoostService();
  private static randomForest = new RandomForestService();
  private static lstm = new LSTMService();
  private static hybrid = new HybridPredictor();

  // Génération de prédictions
  static async generatePrediction(
    categoryId: string,
    config: PredictionConfig
  ): Promise<PredictionResult | null> {
    try {
      toast.info('Génération de prédiction...');
      
      // Récupérer les données historiques
      const historicalData = await DataService.getDrawResults(categoryId);
      
      if (historicalData.length < 10) {
        toast.error('Données insuffisantes pour une prédiction fiable');
        return null;
      }

      let prediction: PredictionResult;

      switch (config.model) {
        case 'xgboost':
          prediction = await this.xgboost.predict(historicalData, config);
          break;
        case 'random_forest':
          prediction = await this.randomForest.predict(historicalData, config);
          break;
        case 'lstm':
          prediction = await this.lstm.predict(historicalData, config);
          break;
        case 'hybrid':
          prediction = await this.hybrid.predict(historicalData, config);
          break;
        default:
          throw new Error('Modèle non supporté');
      }

      // Sauvegarder la prédiction
      const drawDate = this.getNextDrawDate(categoryId);
      await DataService.savePrediction(prediction, categoryId, drawDate);

      toast.success(`Prédiction ${config.model.toUpperCase()} générée`);
      return prediction;
    } catch (error) {
      console.error('Erreur génération prédiction:', error);
      toast.error('Erreur lors de la génération');
      return null;
    }
  }

  // Entraîner tous les modèles
  static async trainAllModels(categoryId: string): Promise<boolean> {
    try {
      toast.info('Entraînement des modèles IA...');
      
      const data = await DataService.getDrawResults(categoryId);
      
      if (data.length < 50) {
        toast.error('Données insuffisantes pour l\'entraînement');
        return false;
      }

      // Entraîner chaque modèle en parallèle
      const trainings = await Promise.allSettled([
        this.xgboost.train(data),
        this.randomForest.train(data),
        this.lstm.train(data),
      ]);

      const successes = trainings.filter(t => t.status === 'fulfilled').length;
      
      if (successes > 0) {
        toast.success(`${successes}/3 modèles entraînés avec succès`);
        return true;
      } else {
        toast.error('Échec de l\'entraînement des modèles');
        return false;
      }
    } catch (error) {
      console.error('Erreur entraînement:', error);
      toast.error('Erreur lors de l\'entraînement');
      return false;
    }
  }

  // Évaluer la performance des modèles
  static async evaluateModels(categoryId: string): Promise<ModelPerformance[]> {
    try {
      const predictions = await DataService.getPredictions(categoryId);
      const performances: ModelPerformance[] = [];

      const models = ['xgboost', 'random_forest', 'lstm', 'hybrid'];

      for (const model of models) {
        const modelPredictions = predictions.filter(p => p.model === model);
        const total = modelPredictions.length;
        const withResults = modelPredictions.filter(p => p.actualNumbers);
        const correct = withResults.reduce((sum, p) => {
          const matches = p.numbers.filter(n => p.actualNumbers?.includes(n)).length;
          return sum + matches;
        }, 0);

        const accuracy = withResults.length > 0 
          ? (correct / (withResults.length * 5)) * 100 
          : 0;

        const avgConfidence = total > 0
          ? modelPredictions.reduce((sum, p) => sum + p.confidence, 0) / total
          : 0;

        performances.push({
          model,
          total_predictions: total,
          correct_predictions: correct,
          accuracy,
          confidence_avg: avgConfidence,
          last_updated: new Date().toISOString(),
        });
      }

      return performances;
    } catch (error) {
      console.error('Erreur évaluation:', error);
      return [];
    }
  }

  // Apprentissage adaptatif
  static async adaptiveLearning(): Promise<void> {
    try {
      const categories = await this.getAllCategoriesWithNewResults();
      
      for (const categoryId of categories) {
        await this.updateModelWeights(categoryId);
      }
    } catch (error) {
      console.error('Erreur apprentissage adaptatif:', error);
    }
  }

  private static async getAllCategoriesWithNewResults(): Promise<string[]> {
    // Logique pour identifier les catégories avec de nouveaux résultats
    return []; // Placeholder
  }

  private static async updateModelWeights(categoryId: string): Promise<void> {
    const performances = await this.evaluateModels(categoryId);
    
    // Ajuster les poids du modèle hybride basé sur les performances
    const bestModel = performances.reduce((best, current) => 
      current.accuracy > best.accuracy ? current : best
    );

    await this.hybrid.updateWeights(bestModel.model, bestModel.accuracy);
  }

  private static getNextDrawDate(categoryId: string): string {
    // Calculer la prochaine date de tirage basée sur l'ID de catégorie
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  // Obtenir les recommandations basées sur les performances
  static async getModelRecommendation(categoryId: string): Promise<string> {
    const performances = await this.evaluateModels(categoryId);
    
    if (performances.length === 0) return 'hybrid';
    
    const bestModel = performances.reduce((best, current) => 
      current.accuracy > best.accuracy ? current : best
    );

    return bestModel.model;
  }
}