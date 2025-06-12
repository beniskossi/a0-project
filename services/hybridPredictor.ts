import { PredictionResult } from '../types';
import { StoredDrawResult } from './indexedDBService';
import { PredictionConfig } from './aiService';
import { XGBoostService } from './xgboostService';
import { RandomForestService } from './randomForestService';
import { LSTMService } from './lstmService';

interface ModelWeight {
  xgboost: number;
  random_forest: number;
  lstm: number;
}

interface HybridPrediction {
  numbers: number[];
  confidence: number;
  modelContributions: {
    xgboost: { numbers: number[]; confidence: number; weight: number };
    random_forest: { numbers: number[]; confidence: number; weight: number };
    lstm: { numbers: number[]; confidence: number; weight: number };
  };
}

export class HybridPredictor {
  private xgboost: XGBoostService;
  private randomForest: RandomForestService;
  private lstm: LSTMService;
  
  private weights: ModelWeight = {
    xgboost: 0.4,      // Fort pour analyse statistique
    random_forest: 0.35, // Bon pour interactions
    lstm: 0.25,        // Complémentaire pour tendances temporelles
  };

  constructor() {
    this.xgboost = new XGBoostService();
    this.randomForest = new RandomForestService();
    this.lstm = new LSTMService();
  }

  async predict(data: StoredDrawResult[], config: PredictionConfig): Promise<PredictionResult> {
    try {
      // Obtenir les prédictions de chaque modèle en parallèle
      const [xgboostPred, rfPred, lstmPred] = await Promise.allSettled([
        this.xgboost.predict(data, config),
        this.randomForest.predict(data, config),
        this.lstm.predict(data, config),
      ]);

      // Extraire les résultats valides
      const predictions = {
        xgboost: xgboostPred.status === 'fulfilled' ? xgboostPred.value : null,
        random_forest: rfPred.status === 'fulfilled' ? rfPred.value : null,
        lstm: lstmPred.status === 'fulfilled' ? lstmPred.value : null,
      };

      // Ajuster les poids selon la disponibilité des modèles
      const adjustedWeights = this.adjustWeightsForAvailability(predictions);

      // Agrégation hybride
      const hybridResult = this.aggregatePredictions(predictions, adjustedWeights);

      return {
        numbers: hybridResult.numbers,
        confidence: hybridResult.confidence,
        model: 'hybrid',
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erreur prédiction hybride:', error);
      // Fallback sur la méthode la plus simple
      return this.fallbackPredict(data);
    }
  }

  private adjustWeightsForAvailability(predictions: {
    xgboost: PredictionResult | null;
    random_forest: PredictionResult | null;
    lstm: PredictionResult | null;
  }): ModelWeight {
    const available = {
      xgboost: predictions.xgboost !== null,
      random_forest: predictions.random_forest !== null,
      lstm: predictions.lstm !== null,
    };

    const totalAvailable = Object.values(available).filter(Boolean).length;
    
    if (totalAvailable === 0) {
      return { xgboost: 1, random_forest: 0, lstm: 0 };
    }

    const adjustedWeights: ModelWeight = { xgboost: 0, random_forest: 0, lstm: 0 };
    let totalWeight = 0;

    // Redistribuer les poids selon la disponibilité et la confiance
    if (available.xgboost && predictions.xgboost) {
      adjustedWeights.xgboost = this.weights.xgboost * predictions.xgboost.confidence;
      totalWeight += adjustedWeights.xgboost;
    }

    if (available.random_forest && predictions.random_forest) {
      adjustedWeights.random_forest = this.weights.random_forest * predictions.random_forest.confidence;
      totalWeight += adjustedWeights.random_forest;
    }

    if (available.lstm && predictions.lstm) {
      adjustedWeights.lstm = this.weights.lstm * predictions.lstm.confidence;
      totalWeight += adjustedWeights.lstm;
    }

    // Normaliser les poids
    if (totalWeight > 0) {
      adjustedWeights.xgboost /= totalWeight;
      adjustedWeights.random_forest /= totalWeight;
      adjustedWeights.lstm /= totalWeight;
    }

    return adjustedWeights;
  }

  private aggregatePredictions(
    predictions: {
      xgboost: PredictionResult | null;
      random_forest: PredictionResult | null;
      lstm: PredictionResult | null;
    },
    weights: ModelWeight
  ): HybridPrediction {
    const numberVotes = new Map<number, number>();
    const modelContributions = {
      xgboost: { numbers: [], confidence: 0, weight: 0 },
      random_forest: { numbers: [], confidence: 0, weight: 0 },
      lstm: { numbers: [], confidence: 0, weight: 0 },
    } as any;

    // Agrégation par vote pondéré
    if (predictions.xgboost && weights.xgboost > 0) {
      predictions.xgboost.numbers.forEach(num => {
        const currentVote = numberVotes.get(num) || 0;
        numberVotes.set(num, currentVote + weights.xgboost);
      });
      
      modelContributions.xgboost = {
        numbers: predictions.xgboost.numbers,
        confidence: predictions.xgboost.confidence,
        weight: weights.xgboost,
      };
    }

    if (predictions.random_forest && weights.random_forest > 0) {
      predictions.random_forest.numbers.forEach(num => {
        const currentVote = numberVotes.get(num) || 0;
        numberVotes.set(num, currentVote + weights.random_forest);
      });
      
      modelContributions.random_forest = {
        numbers: predictions.random_forest.numbers,
        confidence: predictions.random_forest.confidence,
        weight: weights.random_forest,
      };
    }

    if (predictions.lstm && weights.lstm > 0) {
      predictions.lstm.numbers.forEach(num => {
        const currentVote = numberVotes.get(num) || 0;
        numberVotes.set(num, currentVote + weights.lstm);
      });
      
      modelContributions.lstm = {
        numbers: predictions.lstm.numbers,
        confidence: predictions.lstm.confidence,
        weight: weights.lstm,
      };
    }

    // Sélectionner les 5 numéros avec le plus de votes
    const sortedVotes = Array.from(numberVotes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const finalNumbers = sortedVotes.map(([num]) => num).sort((a, b) => a - b);

    // Calculer la confiance hybride
    const weightedConfidence = 
      (predictions.xgboost?.confidence || 0) * weights.xgboost +
      (predictions.random_forest?.confidence || 0) * weights.random_forest +
      (predictions.lstm?.confidence || 0) * weights.lstm;

    // Bonus de confiance pour le consensus
    const consensusBonus = this.calculateConsensusBonus(predictions);
    const finalConfidence = Math.min(0.95, weightedConfidence + consensusBonus);

    return {
      numbers: finalNumbers,
      confidence: finalConfidence,
      modelContributions,
    };
  }

  private calculateConsensusBonus(predictions: {
    xgboost: PredictionResult | null;
    random_forest: PredictionResult | null;
    lstm: PredictionResult | null;
  }): number {
    const validPredictions = Object.values(predictions).filter(p => p !== null);
    
    if (validPredictions.length < 2) return 0;

    // Calculer le nombre de numéros en commun entre les prédictions
    let totalOverlap = 0;
    let comparisons = 0;

    for (let i = 0; i < validPredictions.length; i++) {
      for (let j = i + 1; j < validPredictions.length; j++) {
        const overlap = validPredictions[i]!.numbers.filter(num => 
          validPredictions[j]!.numbers.includes(num)
        ).length;
        
        totalOverlap += overlap;
        comparisons++;
      }
    }

    const avgOverlap = comparisons > 0 ? totalOverlap / comparisons : 0;
    return Math.min(0.2, avgOverlap / 5 * 0.2); // Bonus max de 20%
  }

  // Mise à jour des poids basée sur les performances
  async updateWeights(bestModel: string, accuracy: number): Promise<void> {
    const learningRate = 0.1;
    const accuracyFactor = accuracy / 100;

    // Augmenter le poids du meilleur modèle
    if (bestModel in this.weights) {
      const modelKey = bestModel as keyof ModelWeight;
      this.weights[modelKey] += learningRate * accuracyFactor;
    }

    // Normaliser les poids
    const totalWeight = this.weights.xgboost + this.weights.random_forest + this.weights.lstm;
    
    if (totalWeight > 0) {
      this.weights.xgboost /= totalWeight;
      this.weights.random_forest /= totalWeight;
      this.weights.lstm /= totalWeight;
    }

    // Sauvegarder les nouveaux poids
    await this.saveWeights();
  }

  private async saveWeights(): Promise<void> {
    try {
      localStorage.setItem('hybrid_model_weights', JSON.stringify(this.weights));
    } catch (error) {
      console.warn('Impossible de sauvegarder les poids:', error);
    }
  }

  private async loadWeights(): Promise<void> {
    try {
      const saved = localStorage.getItem('hybrid_model_weights');
      if (saved) {
        this.weights = { ...this.weights, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Impossible de charger les poids sauvegardés:', error);
    }
  }

  private fallbackPredict(data: StoredDrawResult[]): PredictionResult {
    // Méthode de secours simple basée sur la fréquence
    const frequency = new Map<number, number>();
    
    data.slice(0, 20).forEach(result => { // Prendre les 20 derniers tirages
      result.gagnants.forEach(num => {
        frequency.set(num, (frequency.get(num) || 0) + 1);
      });
    });

    const sorted = Array.from(frequency.entries()).sort((a, b) => b[1] - a[1]);
    const numbers = sorted.slice(0, 5).map(([num]) => num).sort((a, b) => a - b);
    
    return {
      numbers,
      confidence: 0.4, // Confiance modérée pour méthode de secours
      model: 'hybrid',
      generatedAt: new Date().toISOString(),
    };
  }

  // Initialisation avec chargement des poids
  async initialize(): Promise<void> {
    await this.loadWeights();
  }

  // Obtenir les poids actuels
  getWeights(): ModelWeight {
    return { ...this.weights };
  }

  // Réinitialiser les poids aux valeurs par défaut
  resetWeights(): void {
    this.weights = {
      xgboost: 0.4,
      random_forest: 0.35,
      lstm: 0.25,
    };
  }
}