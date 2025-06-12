import { PredictionResult } from '../types';
import { StoredDrawResult } from './indexedDBService';
import { PredictionConfig } from './aiService';

interface XGBoostFeatures {
  frequency: number[];
  gaps: number[];
  coOccurrences: number[][];
  trends: number[];
  weights: number[];
}

export class XGBoostService {
  private model: any = null;
  private isInitialized = false;

  constructor() {
    this.initializeModel();
  }

  private async initializeModel(): Promise<void> {
    try {
      // Simuler l'initialisation d'XGBoost (en production, utiliser xgboost-js)
      this.model = {
        weights: new Array(90).fill(0).map(() => Math.random()),
        biases: new Array(90).fill(0).map(() => Math.random() * 0.1),
        learningRate: 0.01,
        maxDepth: 6,
        nEstimators: 100,
      };
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Erreur initialisation XGBoost:', error);
    }
  }

  async train(data: StoredDrawResult[]): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initializeModel();
      }

      // Préparer les features
      const features = this.extractFeatures(data);
      
      // Simuler l'entraînement XGBoost
      for (let epoch = 0; epoch < this.model.nEstimators; epoch++) {
        this.updateWeights(features, data);
        
        // Validation périodique
        if (epoch % 10 === 0) {
          const loss = this.calculateLoss(features, data);
          if (loss < 0.01) break; // Convergence
        }
      }

      return true;
    } catch (error) {
      console.error('Erreur entraînement XGBoost:', error);
      return false;
    }
  }

  async predict(data: StoredDrawResult[], config: PredictionConfig): Promise<PredictionResult> {
    if (!this.isInitialized) {
      await this.initializeModel();
    }

    const features = this.extractFeatures(data);
    const predictions = this.generatePredictions(features, config);
    
    return {
      numbers: predictions.numbers,
      confidence: predictions.confidence,
      model: 'xgboost',
      generatedAt: new Date().toISOString(),
    };
  }

  private extractFeatures(data: StoredDrawResult[]): XGBoostFeatures {
    // Calculer les fréquences
    const frequency = new Array(91).fill(0);
    const lastSeen = new Array(91).fill(-1);
    const coOccurrences = Array(91).fill(null).map(() => new Array(91).fill(0));

    data.forEach((result, index) => {
      result.gagnants.forEach(num => {
        frequency[num]++;
        lastSeen[num] = index;
        
        // Co-occurrences
        result.gagnants.forEach(otherNum => {
          if (num !== otherNum) {
            coOccurrences[num][otherNum]++;
          }
        });
      });
    });

    // Calculer les gaps (écarts)
    const gaps = lastSeen.map((lastIndex, num) => 
      lastIndex >= 0 ? data.length - lastIndex : 999
    );

    // Tendances (moyennes mobiles)
    const trends = this.calculateTrends(data);

    // Poids basés sur la récence
    const weights = frequency.map((freq, num) => {
      const recentWeight = Math.exp(-gaps[num] / 10); // Décroissance exponentielle
      return freq * recentWeight;
    });

    return {
      frequency: frequency.slice(1), // Exclure l'index 0
      gaps: gaps.slice(1),
      coOccurrences: coOccurrences.slice(1).map(row => row.slice(1)),
      trends,
      weights: weights.slice(1),
    };
  }

  private calculateTrends(data: StoredDrawResult[]): number[] {
    const windowSize = Math.min(10, data.length);
    const trends = new Array(90).fill(0);
    
    if (data.length < windowSize) return trends;

    // Analyser les tendances sur une fenêtre glissante
    for (let i = 0; i < windowSize; i++) {
      const result = data[i];
      result.gagnants.forEach(num => {
        trends[num - 1] += (windowSize - i) / windowSize; // Poids décroissant
      });
    }

    return trends;
  }

  private updateWeights(features: XGBoostFeatures, data: StoredDrawResult[]): void {
    // Gradient boosting simplifié
    for (let i = 0; i < this.model.weights.length; i++) {
      const gradient = this.calculateGradient(i, features, data);
      this.model.weights[i] -= this.model.learningRate * gradient;
      this.model.biases[i] -= this.model.learningRate * gradient * 0.1;
    }
  }

  private calculateGradient(index: number, features: XGBoostFeatures, data: StoredDrawResult[]): number {
    // Gradient simplifié basé sur l'erreur de prédiction
    const predicted = this.model.weights[index] * features.frequency[index] + this.model.biases[index];
    const actual = features.frequency[index] / Math.max(1, data.length);
    return 2 * (predicted - actual);
  }

  private calculateLoss(features: XGBoostFeatures, data: StoredDrawResult[]): number {
    let totalLoss = 0;
    
    for (let i = 0; i < this.model.weights.length; i++) {
      const predicted = this.model.weights[i] * features.frequency[i] + this.model.biases[i];
      const actual = features.frequency[i] / Math.max(1, data.length);
      totalLoss += Math.pow(predicted - actual, 2);
    }
    
    return totalLoss / this.model.weights.length;
  }

  private generatePredictions(features: XGBoostFeatures, config: PredictionConfig): {
    numbers: number[];
    confidence: number;
  } {
    // Calculer les scores pour chaque numéro
    const scores = features.frequency.map((freq, index) => {
      let score = this.model.weights[index] * freq + this.model.biases[index];
      
      // Ajuster selon la configuration
      if (config.weight_recent) {
        score *= Math.exp(-features.gaps[index] / 20);
      }
      
      // Ajouter le bruit des co-occurrences
      const coOccScore = features.coOccurrences[index].reduce((sum, coOcc) => sum + coOcc, 0);
      score += coOccScore * 0.1;
      
      return { number: index + 1, score };
    });

    // Trier et sélectionner les top 5
    scores.sort((a, b) => b.score - a.score);
    const topNumbers = scores.slice(0, 5).map(s => s.number);
    
    // Calculer la confiance basée sur la différence des scores
    const topScore = scores[0].score;
    const fifthScore = scores[4].score;
    const confidence = Math.min(0.95, Math.max(0.1, (topScore - fifthScore) / topScore));

    return {
      numbers: topNumbers.sort((a, b) => a - b),
      confidence,
    };
  }
}