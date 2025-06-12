import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { DataService } from '../services/dataService';
import { StoredPrediction } from '../services/indexedDBService';
import { NumberChip } from '../components/NumberChip';

export default function HistoryScreen({ navigation }: any) {
  const theme = useTheme();
  const [predictions, setPredictions] = useState<StoredPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPredictionHistory();
  }, []);

  const loadPredictionHistory = async () => {
    try {
      setLoading(true);
      const data = await DataService.getPredictions();
      setPredictions(data.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()));
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccuracyColor = (accuracy?: number) => {
    if (!accuracy) return theme.colors.border;
    if (accuracy >= 80) return theme.colors.success;
    if (accuracy >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  const getModelIcon = (model: string) => {
    switch (model) {
      case 'xgboost': return 'flash';
      case 'random_forest': return 'tree';
      case 'lstm': return 'trending-up';
      case 'hybrid': return 'diamond';
      default: return 'bulb';
    }
  };

  const renderPredictionItem = ({ item }: { item: StoredPrediction }) => (
    <View style={[styles.predictionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.predictionHeader}>
        <View style={styles.predictionInfo}>
          <Text style={[styles.predictionDate, { color: theme.colors.text }]}>
            {new Date(item.generatedAt).toLocaleDateString('fr-FR')}
          </Text>
          <View style={styles.modelBadge}>
            <Ionicons 
              name={getModelIcon(item.model)} 
              size={16} 
              color={theme.colors.primary} 
            />
            <Text style={[styles.modelText, { color: theme.colors.primary }]}>
              {item.model.toUpperCase()}
            </Text>
          </View>
        </View>
        
        {item.accuracy && (
          <View style={[styles.accuracyBadge, { backgroundColor: getAccuracyColor(item.accuracy) + '20' }]}>
            <Text style={[styles.accuracyText, { color: getAccuracyColor(item.accuracy) }]}>
              {item.accuracy.toFixed(0)}%
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.numbersSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Prédiction
        </Text>
        <View style={styles.numbersContainer}>
          {item.numbers.map((number, index) => (
            <NumberChip key={index} number={number} size="medium" />
          ))}
        </View>
      </View>
      
      {item.actualNumbers && (
        <View style={styles.numbersSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Résultat réel
          </Text>
          <View style={styles.numbersContainer}>
            {item.actualNumbers.map((number, index) => (
              <NumberChip 
                key={index} 
                number={number} 
                size="medium"
                style={{
                  borderWidth: item.numbers.includes(number) ? 2 : 1,
                  borderColor: item.numbers.includes(number) ? theme.colors.success : 'rgba(0,0,0,0.1)',
                }}
              />
            ))}
          </View>
        </View>
      )}
      
      <View style={styles.predictionFooter}>
        <Text style={[styles.confidenceText, { color: theme.colors.text }]}>
          Confiance: {(item.confidence * 100).toFixed(0)}%
        </Text>
        <Text style={[styles.drawDateText, { color: theme.colors.text }]}>
          Tirage: {new Date(item.drawDate).toLocaleDateString('fr-FR')}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Historique des Prédictions
        </Text>
        
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: theme.colors.primary }]}
          onPress={loadPredictionHistory}
        >
          <Ionicons name="refresh" size={20} color="white" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={predictions}
        keyExtractor={(item) => item.id}
        renderItem={renderPredictionItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadPredictionHistory}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color={theme.colors.border} />
            <Text style={[styles.emptyText, { color: theme.colors.text }]}>
              Aucune prédiction dans l'historique
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.text }]}>
              Les prédictions générées apparaîtront ici
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  predictionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  predictionInfo: {
    flex: 1,
  },
  predictionDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  accuracyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  accuracyText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  numbersSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.7,
  },
  numbersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  predictionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  confidenceText: {
    fontSize: 12,
    opacity: 0.7,
  },
  drawDateText: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
});