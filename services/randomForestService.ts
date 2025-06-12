import { PredictionResult } from '../types';
import { StoredDrawResult } from './indexedDBService';
import { PredictionConfig } from './aiService';

interface DecisionTree {
  feature: number;
  threshold: number;
  left?: DecisionTree;
  right?: DecisionTree;
  prediction?: number[];
}

export class RandomForestService {
  private trees: DecisionTree[] = [];
  private nTrees = 50;
  private maxDepth = 10;
  private isInitialized = false;

  constructor() {
    this.initializeForest();
  }

  private async initializeForest(): Promise<void> {
    try {
      this.trees = [];
      this.isInitialized = true;
    } catch (error) {
      console.error('Erreur initialisation Random Forest:', error);
    }
  }

  async train(data: StoredDrawResult[]): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initializeForest();
      }

      // Préparer les features
      const features = this.extractFeatures(data);
      
      // Entraîner chaque arbre avec un échantillon bootstrap
      this.trees = [];
      for (let i = 0; i < this.nTrees; i++) {
        const bootstrapData = this.bootstrapSample(data);
        const tree = this.buildTree(this.extractFeatures(bootstrapData), 0);
        this.trees.push(tree);
      }

      return true;
    } catch (error) {
      console.error('Erreur entraînement Random Forest:', error);
      return false;
    }
  }

  async predict(data: StoredDrawResult[], config: PredictionConfig): Promise<PredictionResult> {
    if (!this.isInitialized || this.trees.length === 0) {
      await this.train(data);
    }

    const features = this.extractFeatures(data);
    const predictions = this.aggregatePredictions(features);
    
    return {
      numbers: predictions.numbers,
      confidence: predictions.confidence,
      model: 'random_forest',
      generatedAt: new Date().toISOString(),
    };
  }

  private extractFeatures(data: StoredDrawResult[]): number[][] {
    const features: number[][] = [];
    
    // Pour chaque tirage, créer un vecteur de features
    data.forEach((result, index) => {
      const feature = new Array(90).fill(0);
      
      // Marquer les numéros gagnants
      result.gagnants.forEach(num => {
        feature[num - 1] = 1;
      });
      
      // Ajouter des features contextuelles
      if (index > 0) {
        const prevResult = data[index - 1];
        const similarity = this.calculateSimilarity(result.gagnants, prevResult.gagnants);
        feature.push(similarity);
      } else {
        feature.push(0);
      }
      
      // Ajouter la date (jour de la semaine)
      const dayOfWeek = new Date(result.date).getDay();
      feature.push(dayOfWeek / 7);
      
      features.push(feature);
    });
    
    return features;
  }

  private calculateSimilarity(nums1: number[], nums2: number[]): number {
    const intersection = nums1.filter(n => nums2.includes(n)).length;
    return intersection / 5;
  }

  private bootstrapSample(data: StoredDrawResult[]): StoredDrawResult[] {
    const sample: StoredDrawResult[] = [];
    const n = data.length;
    
    for (let i = 0; i < n; i++) {
      const randomIndex = Math.floor(Math.random() * n);
      sample.push(data[randomIndex]);
    }
    
    return sample;
  }

  private buildTree(features: number[][], depth: number): DecisionTree {
    if (depth >= this.maxDepth || features.length < 5) {
      return {
        feature: -1,
        threshold: 0,
        prediction: this.calculateLeafPrediction(features),
      };
    }

    const bestSplit = this.findBestSplit(features);
    
    if (!bestSplit) {
      return {
        feature: -1,
        threshold: 0,
        prediction: this.calculateLeafPrediction(features),
      };
    }

    const { leftFeatures, rightFeatures } = this.splitFeatures(features, bestSplit);

    return {
      feature: bestSplit.feature,
      threshold: bestSplit.threshold,
      left: this.buildTree(leftFeatures, depth + 1),
      right: this.buildTree(rightFeatures, depth + 1),
    };
  }

  private findBestSplit(features: number[][]): { feature: number; threshold: number } | null {
    if (features.length === 0) return null;

    let bestGini = Infinity;
    let bestSplit = null;
    const nFeatures = features[0].length;

    // Essayer un sous-ensemble aléatoire de features
    const featuresToTry = Math.floor(Math.sqrt(nFeatures));
    const randomFeatures = this.getRandomFeatures(nFeatures, featuresToTry);

    for (const featureIndex of randomFeatures) {
      const values = features.map(f => f[featureIndex]).filter(v => v !== undefined);
      const uniqueValues = [...new Set(values)];

      for (const threshold of uniqueValues) {
        const gini = this.calculateGiniImpurity(features, featureIndex, threshold);
        
        if (gini < bestGini) {
          bestGini = gini;
          bestSplit = { feature: featureIndex, threshold };
        }
      }
    }

    return bestSplit;
  }

  private getRandomFeatures(nFeatures: number, count: number): number[] {
    const features = Array.from({ length: nFeatures }, (_, i) => i);
    const selected = [];
    
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * features.length);
      selected.push(features.splice(randomIndex, 1)[0]);
    }
    
    return selected;
  }

  private calculateGiniImpurity(features: number[][], featureIndex: number, threshold: number): number {
    const left = features.filter(f => f[featureIndex] <= threshold);
    const right = features.filter(f => f[featureIndex] > threshold);
    
    const total = features.length;
    const leftWeight = left.length / total;
    const rightWeight = right.length / total;
    
    const leftGini = this.calculateNodeGini(left);
    const rightGini = this.calculateNodeGini(right);
    
    return leftWeight * leftGini + rightWeight * rightGini;
  }

  private calculateNodeGini(features: number[][]): number {
    if (features.length === 0) return 0;
    
    // Pour la régression, utiliser la variance comme mesure d'impureté
    const mean = features.reduce((sum, f) => sum + f.reduce((s, v) => s + v, 0), 0) / features.length;
    const variance = features.reduce((sum, f) => {
      const featureSum = f.reduce((s, v) => s + v, 0);
      return sum + Math.pow(featureSum - mean, 2);
    }, 0) / features.length;
    
    return variance;
  }

  private splitFeatures(features: number[][], split: { feature: number; threshold: number }): {
    leftFeatures: number[][];
    rightFeatures: number[][];
  } {
    const leftFeatures = features.filter(f => f[split.feature] <= split.threshold);
    const rightFeatures = features.filter(f => f[split.feature] > split.threshold);
    
    return { leftFeatures, rightFeatures };
  }

  private calculateLeafPrediction(features: number[][]): number[] {
    if (features.length === 0) return [];
    
    // Calculer la moyenne des features pour prédire les numéros les plus probables
    const avgFeature = new Array(90).fill(0);
    
    features.forEach(feature => {
      for (let i = 0; i < 90; i++) {
        avgFeature[i] += feature[i] || 0;
      }
    });
    
    // Normaliser
    const total = features.length;
    const normalized = avgFeature.map(v => v / total);
    
    // Retourner les indices des 5 plus hautes valeurs
    const indexed = normalized.map((value, index) => ({ value, index: index + 1 }));
    indexed.sort((a, b) => b.value - a.value);
    
    return indexed.slice(0, 5).map(item => item.index);
  }

  private aggregatePredictions(features: number[][]): { numbers: number[]; confidence: number } {
    const votes = new Map<number, number>();
    
    // Obtenir les prédictions de chaque arbre
    for (const tree of this.trees) {
      const prediction = this.predictWithTree(tree, features[0] || new Array(92).fill(0));
      
      prediction.forEach(num => {
        votes.set(num, (votes.get(num) || 0) + 1);
      });
    }
    
    // Trier par nombre de votes
    const sortedVotes = Array.from(votes.entries()).sort((a, b) => b[1] - a[1]);
    const topNumbers = sortedVotes.slice(0, 5).map(([num]) => num);
    
    // Calculer la confiance basée sur le consensus
    const maxVotes = sortedVotes[0]?.[1] || 0;
    const confidence = Math.min(0.95, maxVotes / this.nTrees);
    
    return {
      numbers: topNumbers.sort((a, b) => a - b),
      confidence,
    };
  }

  private predictWithTree(tree: DecisionTree, features: number[]): number[] {
    if (tree.prediction) {
      return tree.prediction;
    }
    
    if (tree.feature === -1) {
      return [];
    }
    
    const featureValue = features[tree.feature] || 0;
    
    if (featureValue <= tree.threshold) {
      return tree.left ? this.predictWithTree(tree.left, features) : [];
    } else {
      return tree.right ? this.predictWithTree(tree.right, features) : [];
    }
  }
}