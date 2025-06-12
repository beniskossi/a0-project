import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Modal,
  Switch,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { AIService, PredictionConfig, ModelPerformance } from '../services/aiService';
import { DataService } from '../services/dataService';
import { DRAW_CATEGORIES } from '../constants/drawSchedule';
import { NumberChip } from '../components/NumberChip';
import { PredictionResult } from '../types';
import { toast } from 'sonner-native';

interface ModelInfo {
  id: 'xgboost' | 'random_forest' | 'lstm' | 'hybrid';
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  strengths: string[];
}

const MODELS: ModelInfo[] = [
  {
    id: 'xgboost',
    name: 'XGBoost',
    description: 'Analyse statistique rapide et robuste',
    icon: 'flash',
    color: '#10B981',
    strengths: ['Fréquences', 'Écarts', 'Performance'],
  },
  {
    id: 'random_forest',
    name: 'Random Forest',
    description: 'Validation des interactions entre numéros',
    icon: 'tree',
    color: '#8B5CF6',
    strengths: ['Interactions', 'Stabilité', 'Robustesse'],
  },
  {
    id: 'lstm',
    name: 'LSTM Neural',
    description: 'Détection des tendances temporelles',
    icon: 'trending-up',
    color: '#3B82F6',
    strengths: ['Temporalité', 'Apprentissage', 'Adaptation'],
  },
  {
    id: 'hybrid',
    name: 'Modèle Hybride',
    description: 'Agrégation intelligente des 3 modèles',
    icon: 'diamond',
    color: '#F59E0B',
    strengths: ['Équilibré', 'Précis', 'Fiable'],
  },
];

export default function PredictScreen({ navigation }: any) {
  const theme = useTheme();
  const { selectedCategory } = useAppStore();
  
  // États principaux
  const [activeCategory, setActiveCategory] = useState(selectedCategory?.id || DRAW_CATEGORIES[0].id);
  const [selectedModel, setSelectedModel] = useState<ModelInfo>(MODELS[3]); // Hybride par défaut
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Configuration du modèle
  const [config, setConfig] = useState<PredictionConfig>({
    model: 'hybrid',
    confidence_threshold: 0.3,
    lookback_days: 30,
    include_machine_numbers: false,
    weight_recent: true,
  });
  
  // Résultats
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [modelPerformances, setModelPerformances] = useState<ModelPerformance[]>([]);
  const [isTraining, setIsTraining] = useState(false);

  useEffect(() => {
    loadModelPerformances();
  }, [activeCategory]);

  const loadModelPerformances = async () => {
    try {
      const performances = await AIService.evaluateModels(activeCategory);
      setModelPerformances(performances);
    } catch (error) {
      console.error('Erreur chargement performances:', error);
    }
  };

  const handleGeneratePrediction = async () => {
    try {
      setIsGenerating(true);
      
      const updatedConfig = { ...config, model: selectedModel.id };
      const result = await AIService.generatePrediction(activeCategory, updatedConfig);
      
      if (result) {
        setPrediction(result);
        await loadModelPerformances(); // Rafraîchir les performances
      }
    } catch (error) {
      console.error('Erreur génération:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTrainModels = async () => {
    try {
      setIsTraining(true);
      const success = await AIService.trainAllModels(activeCategory);
      
      if (success) {
        await loadModelPerformances();
        toast.success('Modèles entraînés avec succès');
      }
    } catch (error) {
      console.error('Erreur entraînement:', error);
    } finally {
      setIsTraining(false);
    }
  };

  const renderCategorySelector = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
      {DRAW_CATEGORIES.map(category => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryButton,
            {
              backgroundColor: activeCategory === category.id ? theme.colors.primary : theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => setActiveCategory(category.id)}
        >
          <Text
            style={[
              styles.categoryButtonText,
              {
                color: activeCategory === category.id ? 'white' : theme.colors.text,
              },
            ]}
          >
            {category.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderModelSelector = () => (
    <View style={styles.modelSelector}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Choisir le Modèle IA
      </Text>
      
      <View style={styles.modelsGrid}>
        {MODELS.map(model => {
          const performance = modelPerformances.find(p => p.model === model.id);
          const isSelected = selectedModel.id === model.id;
          
          return (
            <TouchableOpacity
              key={model.id}
              style={[
                styles.modelCard,
                {
                  backgroundColor: isSelected ? model.color + '20' : theme.colors.card,
                  borderColor: isSelected ? model.color : theme.colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => setSelectedModel(model)}
            >
              <View style={styles.modelHeader}>
                <Ionicons 
                  name={model.icon} 
                  size={32} 
                  color={isSelected ? model.color : theme.colors.text} 
                />
                {performance && (
                  <View style={[styles.accuracyBadge, { backgroundColor: model.color + '30' }]}>
                    <Text style={[styles.accuracyText, { color: model.color }]}>
                      {performance.accuracy.toFixed(0)}%
                    </Text>
                  </View>
                )}
              </View>
              
              <Text style={[styles.modelName, { color: theme.colors.text }]}>
                {model.name}
              </Text>
              
              <Text style={[styles.modelDescription, { color: theme.colors.text }]}>
                {model.description}
              </Text>
              
              <View style={styles.modelStrengths}>
                {model.strengths.map(strength => (
                  <View key={strength} style={[styles.strengthTag, { backgroundColor: model.color + '20' }]}>
                    <Text style={[styles.strengthText, { color: model.color }]}>
                      {strength}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={[styles.configButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => setShowConfig(true)}
      >
        <Ionicons name="settings" size={20} color={theme.colors.primary} />
        <Text style={[styles.buttonText, { color: theme.colors.text }]}>
          Configuration
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.trainButton, { backgroundColor: theme.colors.warning }]}
        onPress={handleTrainModels}
        disabled={isTraining}
      >
        {isTraining ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Ionicons name="school" size={20} color="white" />
        )}
        <Text style={styles.trainButtonText}>
          {isTraining ? 'Entraînement...' : 'Entraîner'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.generateButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleGeneratePrediction}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Ionicons name="bulb" size={20} color="white" />
        )}
        <Text style={styles.generateButtonText}>
          {isGenerating ? 'Génération...' : 'Prédire'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPredictionResult = () => {
    if (!prediction) return null;

    return (
      <View style={[styles.predictionResult, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.predictionHeader}>
          <Text style={[styles.predictionTitle, { color: theme.colors.text }]}>
            Prédiction {selectedModel.name}
          </Text>
          <View style={[styles.confidenceBadge, { backgroundColor: selectedModel.color + '20' }]}>
            <Text style={[styles.confidenceText, { color: selectedModel.color }]}>
              {(prediction.confidence * 100).toFixed(0)}% confiance
            </Text>
          </View>
        </View>
        
        <View style={styles.predictedNumbers}>
          {prediction.numbers.map((number, index) => (
            <View key={index} style={styles.numberWithRank}>
              <NumberChip number={number} size="large" />
              <Text style={[styles.rankText, { color: theme.colors.text }]}>
                #{index + 1}
              </Text>
            </View>
          ))}
        </View>
        
        <View style={styles.predictionMeta}>
          <Text style={[styles.metaText, { color: theme.colors.text }]}>
            Généré le {new Date(prediction.generatedAt).toLocaleString('fr-FR')}
          </Text>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigation.navigate('History')}
          >
            <Ionicons name="time" size={16} color={theme.colors.primary} />
            <Text style={[styles.historyButtonText, { color: theme.colors.primary }]}>
              Voir l'historique
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderConfigModal = () => (
    <Modal
      visible={showConfig}
      transparent
      animationType="slide"
      onRequestClose={() => setShowConfig(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.configModal, { backgroundColor: theme.colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Configuration Avancée
            </Text>
            <TouchableOpacity onPress={() => setShowConfig(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.configContent}>
            <View style={styles.configSection}>
              <Text style={[styles.configLabel, { color: theme.colors.text }]}>
                Seuil de Confiance: {(config.confidence_threshold * 100).toFixed(0)}%
              </Text>
              <View style={styles.sliderContainer}>
                <TextInput
                  style={[styles.configInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
                  value={(config.confidence_threshold * 100).toString()}
                  onChangeText={(text) => setConfig({
                    ...config,
                    confidence_threshold: Math.max(0, Math.min(100, parseInt(text) || 0)) / 100
                  })}
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <View style={styles.configSection}>
              <Text style={[styles.configLabel, { color: theme.colors.text }]}>
                Période d'Analyse (jours): {config.lookback_days}
              </Text>
              <TextInput
                style={[styles.configInput, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
                value={config.lookback_days.toString()}
                onChangeText={(text) => setConfig({
                  ...config,
                  lookback_days: Math.max(7, Math.min(365, parseInt(text) || 30))
                })}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.configSection}>
              <View style={styles.switchRow}>
                <Text style={[styles.configLabel, { color: theme.colors.text }]}>
                  Inclure Numéros Machine
                </Text>
                <Switch
                  value={config.include_machine_numbers}
                  onValueChange={(value) => setConfig({
                    ...config,
                    include_machine_numbers: value
                  })}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                />
              </View>
            </View>
            
            <View style={styles.configSection}>
              <View style={styles.switchRow}>
                <Text style={[styles.configLabel, { color: theme.colors.text }]}>
                  Privilégier Données Récentes
                </Text>
                <Switch
                  value={config.weight_recent}
                  onValueChange={(value) => setConfig({
                    ...config,
                    weight_recent: value
                  })}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                />
              </View>
            </View>
          </ScrollView>
          
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowConfig(false)}
          >
            <Text style={styles.applyButtonText}>Appliquer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Prédictions IA Avancées
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.text }]}>
          Modèles d'apprentissage automatique
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sélecteur de catégorie */}
        {renderCategorySelector()}
        
        {/* Sélecteur de modèle */}
        {renderModelSelector()}
        
        {/* Boutons d'action */}
        {renderActionButtons()}
        
        {/* Résultat de prédiction */}
        {renderPredictionResult()}
      </ScrollView>
      
      {/* Modal de configuration */}
      {renderConfigModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  categorySelector: {
    paddingHorizontal: 8,
    paddingVertical: 16,
    maxHeight: 60,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  modelSelector: {
    paddingVertical: 16,
  },
  modelsGrid: {
    paddingHorizontal: 16,
  },
  modelCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  accuracyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  accuracyText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  modelName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modelDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 12,
  },
  modelStrengths: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  strengthTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  configButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  trainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  generateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  trainButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  generateButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  predictionResult: {
    margin: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  predictionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  predictedNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  numberWithRank: {
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    opacity: 0.7,
  },
  predictionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  metaText: {
    fontSize: 12,
    opacity: 0.7,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  configModal: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  configContent: {
    padding: 16,
  },
  configSection: {
    marginBottom: 20,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  configInput: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  sliderContainer: {
    marginTop: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  applyButton: {
    margin: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});