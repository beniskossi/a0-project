import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { DataService } from '../services/dataService';
import { DRAW_CATEGORIES } from '../constants/drawSchedule';
import { NumberFrequency } from '../types';
import { FrequencyChart } from '../components/Chart/FrequencyChart';
import { HeatMapChart } from '../components/Chart/HeatMapChart';
import { TrendChart } from '../components/Chart/TrendChart';
import { NumberChip } from '../components/NumberChip';

interface StatsData {
  frequencies: NumberFrequency[];
  totalDraws: number;
  mostFrequent: NumberFrequency[];
  leastFrequent: NumberFrequency[];
  gaps: Map<number, number>;
  trends: Array<{ date: string; value: number }>;
  heatMapData: Array<{ number: number; frequency: number; lastWeeks: number[] }>;
}

export default function StatsScreen({ navigation }: any) {
  const theme = useTheme();
  const { selectedCategory } = useAppStore();
  const [activeCategory, setActiveCategory] = useState(selectedCategory?.id || DRAW_CATEGORIES[0].id);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'frequency' | 'heatmap' | 'trends' | 'analysis'>('frequency');

  useEffect(() => {
    loadStatistics();
  }, [activeCategory]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const results = await DataService.getDrawResults(activeCategory);
      
      if (results.length === 0) {
        setStatsData(null);
        return;
      }

      // Calculer les fréquences
      const frequencyMap = new Map<number, number>();
      const lastSeenMap = new Map<number, string>();
      const weeklyData = new Map<number, number[]>();

      results.forEach(result => {
        result.gagnants.forEach(num => {
          frequencyMap.set(num, (frequencyMap.get(num) || 0) + 1);
          if (!lastSeenMap.has(num)) {
            lastSeenMap.set(num, result.date);
          }
        });
      });

      // Calculer les données hebdomaires pour la heatmap
      const last10Weeks = getLastNWeeks(10);
      for (let num = 1; num <= 90; num++) {
        const weekCounts = last10Weeks.map(week => {
          return results.filter(result => {
            const resultDate = new Date(result.date);
            return resultDate >= week.start && 
                   resultDate <= week.end && 
                   result.gagnants.includes(num);
          }).length;
        });
        weeklyData.set(num, weekCounts);
      }

      // Créer les objets NumberFrequency
      const frequencies: NumberFrequency[] = [];
      for (let num = 1; num <= 90; num++) {
        const count = frequencyMap.get(num) || 0;
        const percentage = (count / results.length) * 100;
        const lastSeen = lastSeenMap.get(num);
        const gap = lastSeen ? Math.floor((Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24)) : null;
        
        frequencies.push({
          number: num,
          count,
          percentage,
          lastSeen,
          gap: gap || undefined,
        });
      }

      // Trier par fréquence
      frequencies.sort((a, b) => b.count - a.count);

      // Calculer les tendances (moyenne mobile sur 30 jours)
      const trends = calculateTrends(results);

      // Créer les données de heatmap
      const heatMapData = Array.from({ length: 90 }, (_, i) => ({
        number: i + 1,
        frequency: frequencyMap.get(i + 1) || 0,
        lastWeeks: weeklyData.get(i + 1) || Array(10).fill(0),
      }));

      setStatsData({
        frequencies,
        totalDraws: results.length,
        mostFrequent: frequencies.slice(0, 10),
        leastFrequent: frequencies.slice(-10).reverse(),
        gaps: new Map(frequencies.map(f => [f.number, f.gap || 0])),
        trends,
        heatMapData,
      });
    } catch (error) {
      console.error('Erreur statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLastNWeeks = (n: number) => {
    const weeks = [];
    const now = new Date();
    for (let i = 0; i < n; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i + 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weeks.push({ start: weekStart, end: weekEnd });
    }
    return weeks.reverse();
  };

  const calculateTrends = (results: any[]) => {
    const trends = [];
    const sortedResults = results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (let i = 0; i < sortedResults.length; i += 7) { // Par semaine
      const weekResults = sortedResults.slice(i, i + 7);
      const avgSum = weekResults.reduce((sum, result) => {
        return sum + result.gagnants.reduce((a: number, b: number) => a + b, 0);
      }, 0);
      
      trends.push({
        date: weekResults[0].date,
        value: Math.round(avgSum / (weekResults.length * 5)),
      });
    }
    
    return trends;
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

  const renderTabButton = (tab: typeof activeTab, title: string, icon: keyof typeof Ionicons.glyphMap) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        {
          backgroundColor: activeTab === tab ? theme.colors.primary : 'transparent',
          borderColor: theme.colors.border,
        },
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons
        name={icon}
        size={20}
        color={activeTab === tab ? 'white' : theme.colors.text}
      />
      <Text
        style={[
          styles.tabText,
          {
            color: activeTab === tab ? 'white' : theme.colors.text,
          },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Ionicons name="stats-chart" size={64} color={theme.colors.border} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Calcul des statistiques...
          </Text>
        </View>
      );
    }

    if (!statsData) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="bar-chart-outline" size={64} color={theme.colors.border} />
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            Aucune donnée statistique disponible
          </Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'frequency':
        return (
          <ScrollView style={styles.content}>
            <View style={[styles.statsCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Fréquence des Numéros
              </Text>
              <FrequencyChart data={statsData.frequencies.slice(0, 45)} />
            </View>
            
            <View style={styles.topNumbers}>
              <View style={[styles.topSection, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.success }]}>
                  Plus Fréquents
                </Text>
                <View style={styles.numbersGrid}>
                  {statsData.mostFrequent.slice(0, 10).map(item => (
                    <View key={item.number} style={styles.numberItem}>
                      <NumberChip number={item.number} size="medium" />
                      <Text style={[styles.numberCount, { color: theme.colors.text }]}>
                        {item.count}x
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              
              <View style={[styles.topSection, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>
                  Moins Fréquents
                </Text>
                <View style={styles.numbersGrid}>
                  {statsData.leastFrequent.slice(0, 10).map(item => (
                    <View key={item.number} style={styles.numberItem}>
                      <NumberChip number={item.number} size="medium" />
                      <Text style={[styles.numberCount, { color: theme.colors.text }]}>
                        {item.count}x
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        );

      case 'heatmap':
        return (
          <ScrollView style={styles.content}>
            <View style={[styles.statsCard, { backgroundColor: theme.colors.card }]}>
              <HeatMapChart data={statsData.heatMapData} />
            </View>
          </ScrollView>
        );

      case 'trends':
        return (
          <ScrollView style={styles.content}>
            <View style={[styles.statsCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Tendance des Moyennes
              </Text>
              <TrendChart data={statsData.trends} />
            </View>
          </ScrollView>
        );

      case 'analysis':
        return (
          <ScrollView style={styles.content}>
            <View style={[styles.statsCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Analyse Globale
              </Text>
              <View style={styles.analysisGrid}>
                <View style={styles.analysisItem}>
                  <Text style={[styles.analysisValue, { color: theme.colors.primary }]}>
                    {statsData.totalDraws}
                  </Text>
                  <Text style={[styles.analysisLabel, { color: theme.colors.text }]}>
                    Tirages analysés
                  </Text>
                </View>
                
                <View style={styles.analysisItem}>
                  <Text style={[styles.analysisValue, { color: theme.colors.success }]}>
                    {statsData.mostFrequent[0]?.number || 'N/A'}
                  </Text>
                  <Text style={[styles.analysisLabel, { color: theme.colors.text }]}>
                    Numéro le plus fréquent
                  </Text>
                </View>
                
                <View style={styles.analysisItem}>
                  <Text style={[styles.analysisValue, { color: theme.colors.warning }]}>
                    {Math.round(statsData.frequencies.reduce((sum, f) => sum + f.percentage, 0) / 90 * 100) / 100}%
                  </Text>
                  <Text style={[styles.analysisLabel, { color: theme.colors.text }]}>
                    Fréquence moyenne
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Statistiques Avancées
        </Text>
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: theme.colors.primary }]}
          onPress={loadStatistics}
        >
          <Ionicons name="refresh" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Category Selector */}
      {renderCategorySelector()}

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {renderTabButton('frequency', 'Fréquences', 'bar-chart')}
        {renderTabButton('heatmap', 'Carte Chaleur', 'grid')}
        {renderTabButton('trends', 'Tendances', 'trending-up')}
        {renderTabButton('analysis', 'Analyse', 'analytics')}
      </ScrollView>

      {/* Content */}
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorySelector: {
    maxHeight: 60,
    paddingHorizontal: 8,
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
  tabsContainer: {
    maxHeight: 60,
    paddingHorizontal: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  topNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 0.48,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  numbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  numberItem: {
    alignItems: 'center',
    margin: 4,
  },
  numberCount: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  analysisGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  analysisItem: {
    alignItems: 'center',
  },
  analysisValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  analysisLabel: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});