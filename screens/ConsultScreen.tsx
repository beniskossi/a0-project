import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { DataService } from '../services/dataService';
import { StoredDrawResult } from '../services/indexedDBService';
import { NumberChip } from '../components/NumberChip';
import { DRAW_CATEGORIES } from '../constants/drawSchedule';

export default function ConsultScreen({ navigation }: any) {
  const theme = useTheme();
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [results, setResults] = useState<StoredDrawResult[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedNumber && selectedCategory) {
      analyzeNumber();
    }
  }, [selectedNumber, selectedCategory]);

  const analyzeNumber = async () => {
    if (!selectedNumber || !selectedCategory) return;
    
    try {
      setLoading(true);
      const data = await DataService.getDrawResults(selectedCategory);
      setResults(data);
      
      // Analyser les occurrences du numéro
      const occurrences = data.filter(result => 
        result.gagnants.includes(selectedNumber)
      );
      
      // Analyser les co-occurrences
      const coOccurrences = new Map<number, number>();
      const nextDrawNumbers = new Map<number, number>();
      
      occurrences.forEach((result, index) => {
        // Co-occurrences dans le même tirage
        result.gagnants.forEach(num => {
          if (num !== selectedNumber) {
            coOccurrences.set(num, (coOccurrences.get(num) || 0) + 1);
          }
        });
        
        // Numéros du tirage suivant
        if (index > 0) {
          const nextResult = data[index - 1]; // Les données sont triées par date décroissante
          nextResult.gagnants.forEach(num => {
            nextDrawNumbers.set(num, (nextDrawNumbers.get(num) || 0) + 1);
          });
        }
      });
      
      // Calculer les statistiques
      const frequency = occurrences.length;
      const percentage = ((frequency / data.length) * 100);
      const lastSeen = occurrences[0]?.date;
      const gap = lastSeen ? Math.floor((Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24)) : null;
      
      // Top co-occurrences
      const topCoOccurrences = Array.from(coOccurrences.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      // Top prédicteurs (numéros qui annoncent le numéro sélectionné)
      const topPredictors = Array.from(nextDrawNumbers.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      setAnalysis({
        frequency,
        percentage,
        lastSeen,
        gap,
        topCoOccurrences,
        topPredictors,
        occurrences: occurrences.slice(0, 20), // Les 20 dernières occurrences
      });
    } catch (error) {
      console.error('Erreur analyse:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderNumberSelector = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Sélectionner un numéro à analyser
      </Text>
      <View style={styles.numberGrid}>
        {Array.from({ length: 90 }, (_, i) => i + 1).map(number => (
          <TouchableOpacity
            key={number}
            style={[
              styles.numberButton,
              {
                backgroundColor: selectedNumber === number ? theme.colors.primary : theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setSelectedNumber(number)}
          >
            <NumberChip 
              number={number} 
              size="small"
              style={{
                opacity: selectedNumber === number ? 1 : 0.7,
              }}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCategorySelector = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Sélectionner un tirage
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {DRAW_CATEGORIES.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              {
                backgroundColor: selectedCategory === category.id ? theme.colors.primary : theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                {
                  color: selectedCategory === category.id ? 'white' : theme.colors.text,
                },
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderAnalysis = () => {
    if (!analysis) return null;

    return (
      <ScrollView style={styles.analysisContainer}>
        {/* Statistiques générales */}
        <View style={[styles.statsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Statistiques générales
          </Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                {analysis.frequency}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.text }]}>
                Apparitions
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                {analysis.percentage.toFixed(1)}%
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.text }]}>
                Fréquence
              </Text>
            </View>
            
            {analysis.gap && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.warning }]}>
                  {analysis.gap}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.text }]}>
                  Jours d'écart
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Co-occurrences */}
        {analysis.topCoOccurrences.length > 0 && (
          <View style={[styles.statsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Accompagne souvent ces numéros
            </Text>
            <View style={styles.numbersContainer}>
              {analysis.topCoOccurrences.map(([number, count]: [number, number]) => (
                <View key={number} style={styles.coOccurrenceItem}>
                  <NumberChip number={number} size="small" />
                  <Text style={[styles.countBadge, { color: theme.colors.primary }]}>
                    {count}x
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Prédicteurs */}
        {analysis.topPredictors.length > 0 && (
          <View style={[styles.statsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Annoncé par ces numéros (tirage précédent)
            </Text>
            <View style={styles.numbersContainer}>
              {analysis.topPredictors.map(([number, count]: [number, number]) => (
                <View key={number} style={styles.coOccurrenceItem}>
                  <NumberChip number={number} size="small" />
                  <Text style={[styles.countBadge, { color: theme.colors.success }]}>
                    {count}x
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Historique des occurrences */}
        <View style={[styles.statsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Dernières apparitions
          </Text>
          {analysis.occurrences.map((result: StoredDrawResult, index: number) => (
            <View key={result.id} style={styles.occurrenceItem}>
              <Text style={[styles.occurrenceDate, { color: theme.colors.text }]}>
                {new Date(result.date).toLocaleDateString('fr-FR')}
              </Text>
              <View style={styles.occurrenceNumbers}>
                {result.gagnants.map((num, numIndex) => (
                  <NumberChip 
                    key={numIndex} 
                    number={num} 
                    size="small"
                    style={{
                      opacity: num === selectedNumber ? 1 : 0.5,
                      borderWidth: num === selectedNumber ? 2 : 1,
                      borderColor: num === selectedNumber ? theme.colors.success : 'rgba(0,0,0,0.1)',
                    }}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

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
          Consulter un Numéro
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {renderNumberSelector()}
        {renderCategorySelector()}
        
        {loading && (
          <View style={styles.loadingContainer}>
            <Ionicons name="refresh" size={32} color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Analyse en cours...
            </Text>
          </View>
        )}
        
        {renderAnalysis()}
      </ScrollView>
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
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  numberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  numberButton: {
    width: '10%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  analysisContainer: {
    padding: 16,
  },
  statsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  numbersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  coOccurrenceItem: {
    alignItems: 'center',
    margin: 4,
  },
  countBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  occurrenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  occurrenceDate: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  occurrenceNumbers: {
    flexDirection: 'row',
    flex: 2,
    justifyContent: 'flex-end',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
});