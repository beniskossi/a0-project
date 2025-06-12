import * as tf from '@tensorflow/tfjs';
import { PredictionResult } from '../types';
import { StoredDrawResult } from './indexedDBService';
import { PredictionConfig } from './aiService';

export class LSTMService {
  private model: tf.Sequential | null = null;
  private isInitialized = false;
  private sequenceLength = 10;
  private inputSize = 90;

  constructor() {
    this.initializeModel();
  }

  private async initializeModel(): Promise<void> {
    try {
      // Initializer TensorFlow.js
      await tf.ready();
      
      this.model = tf.sequential({
        layers: [
          tf.layers.lstm({
            units: 128,
            returnSequences: true,
            inputShape: [this.sequenceLength, this.inputSize],
            dropout: 0.2,
            recurrentDropout: 0.2,
          }),
          tf.layers.lstm({
            units: 64,
            returnSequences: false,
            dropout: 0.2,
            recurrentDropout: 0.2,
          }),
          tf.layers.dense({
            units: 128,
            activation: 'relu',
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({
            units: this.inputSize,
            activation: 'sigmoid', // Pour probabilités 0-1
          }),
        ],
      });

      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Erreur initialisation LSTM:', error);
    }
  }

  async train(data: StoredDrawResult[]): Promise<boolean> {
    try {
      if (!this.isInitialized || !this.model) {
        await this.initializeModel();
      }

      if (data.length < this.sequenceLength + 10) {
        console.warn('Données insuffisantes pour LSTM');
        return false;
      }

      // Préparer les données pour LSTM
      const { xs, ys } = this.prepareTrainingData(data);
      
      if (xs.shape[0] === 0) {
        console.warn('Aucune séquence générée');
        return false;
      }

      // Entraîner le modèle
      const history = await this.model!.fit(xs, ys, {
        epochs: 50,
        batchSize: 8,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              console.log(`Époque ${epoch}: loss=${logs?.loss?.toFixed(4)}, acc=${logs?.acc?.toFixed(4)}`);
            }
          }
        },
      });

      // Nettoyer les tensors
      xs.dispose();
      ys.dispose();

      const finalLoss = history.history.loss.slice(-1)[0] as number;
      return finalLoss < 0.5; // Critère de convergence
    } catch (error) {
      console.error('Erreur entraînement LSTM:', error);
      return false;
    }
  }

  async predict(data: StoredDrawResult[], config: PredictionConfig): Promise<PredictionResult> {
    if (!this.isInitialized || !this.model) {
      await this.initializeModel();
      // Si pas de modèle entraîné, utiliser des prédictions basées sur la fréquence
      return this.fallbackPredict(data);
    }

    try {
      // Prendre les dernières séquences pour prédiction
      const sequence = this.prepareSequence(data.slice(0, this.sequenceLength));
      
      if (!sequence) {
        return this.fallbackPredict(data);
      }

      // Faire la prédiction
      const prediction = this.model.predict(sequence) as tf.Tensor;
      const probabilities = await prediction.data();
      
      // Nettoyer
      sequence.dispose();
      prediction.dispose();

      // Convertir les probabilités en numéros
      const result = this.probabilitiesToNumbers(Array.from(probabilities), config);
      
      return {
        numbers: result.numbers,
        confidence: result.confidence,
        model: 'lstm',
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erreur prédiction LSTM:', error);
      return this.fallbackPredict(data);
    }
  }

  private prepareTrainingData(data: StoredDrawResult[]): { xs: tf.Tensor; ys: tf.Tensor } {
    const sequences: number[][][] = [];
    const targets: number[][] = [];

    // Créer des séquences glissantes
    for (let i = 0; i <= data.length - this.sequenceLength - 1; i++) {
      const sequence = data.slice(i, i + this.sequenceLength);
      const target = data[i + this.sequenceLength];

      const sequenceVectors = sequence.map(result => this.resultToVector(result));
      const targetVector = this.resultToVector(target);

      sequences.push(sequenceVectors);
      targets.push(targetVector);
    }

    if (sequences.length === 0) {
      return {
        xs: tf.zeros([0, this.sequenceLength, this.inputSize]),
        ys: tf.zeros([0, this.inputSize]),
      };
    }

    const xs = tf.tensor3d(sequences);
    const ys = tf.tensor2d(targets);

    return { xs, ys };
  }

  private prepareSequence(data: StoredDrawResult[]): tf.Tensor | null {
    if (data.length < this.sequenceLength) {
      return null;
    }

    const sequence = data.slice(0, this.sequenceLength).map(result => this.resultToVector(result));
    return tf.tensor3d([sequence]); // Batch size = 1
  }

  private resultToVector(result: StoredDrawResult): number[] {
    const vector = new Array(this.inputSize).fill(0);
    
    // One-hot encoding pour les numéros gagnants
    result.gagnants.forEach(num => {
      if (num >= 1 && num <= 90) {
        vector[num - 1] = 1;
      }
    });

    return vector;
  }

  private probabilitiesToNumbers(probabilities: number[], config: PredictionConfig): {
    numbers: number[];
    confidence: number;
  } {
    // Créer des paires (numéro, probabilité) et trier
    const numberProbs = probabilities.map((prob, index) => ({
      number: index + 1,
      probability: prob,
    }));

    numberProbs.sort((a, b) => b.probability - a.probability);

    // Appliquer le seuil de confiance
    const filtered = numberProbs.filter(np => np.probability >= config.confidence_threshold);
    
    // Prendre les top 5 ou tous ceux au-dessus du seuil
    const selected = filtered.length >= 5 ? filtered.slice(0, 5) : numberProbs.slice(0, 5);
    
    const numbers = selected.map(np => np.number).sort((a, b) => a - b);
    
    // Calculer la confiance moyenne
    const avgConfidence = selected.reduce((sum, np) => sum + np.probability, 0) / selected.length;
    
    return {
      numbers,
      confidence: Math.min(0.95, avgConfidence),
    };
  }

  private fallbackPredict(data: StoredDrawResult[]): PredictionResult {
    // Prédiction de secours basée sur la fréquence simple
    const frequency = new Map<number, number>();
    
    data.forEach(result => {
      result.gagnants.forEach(num => {
        frequency.set(num, (frequency.get(num) || 0) + 1);
      });
    });

    const sorted = Array.from(frequency.entries()).sort((a, b) => b[1] - a[1]);
    const numbers = sorted.slice(0, 5).map(([num]) => num).sort((a, b) => a - b);
    
    return {
      numbers,
      confidence: 0.3, // Faible confiance pour méthode de secours
      model: 'lstm',
      generatedAt: new Date().toISOString(),
    };
  }

  // Mise à jour incrémentale du modèle
  async incrementalUpdate(newData: StoredDrawResult[]): Promise<boolean> {
    if (!this.model || newData.length === 0) return false;

    try {
      const { xs, ys } = this.prepareTrainingData(newData);
      
      if (xs.shape[0] === 0) return false;

      // Entraînement rapide avec moins d'époques
      await this.model.fit(xs, ys, {
        epochs: 5,
        batchSize: 4,
        verbose: 0,
      });

      xs.dispose();
      ys.dispose();

      return true;
    } catch (error) {
      console.error('Erreur mise à jour incrémentale:', error);
      return false;
    }
  }

  // Sauvegarder le modèle
  async saveModel(): Promise<boolean> {
    if (!this.model) return false;

    try {
      await this.model.save('localstorage://lstm-model');
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde modèle:', error);
      return false;
    }
  }

  // Charger le modèle
  async loadModel(): Promise<boolean> {
    try {
      this.model = await tf.loadLayersModel('localstorage://lstm-model') as tf.Sequential;
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.warn('Aucun modèle sauvegardé trouvé');
      return false;
    }
  }
}