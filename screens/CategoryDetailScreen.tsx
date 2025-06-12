import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { DataService } from '../services/dataService';
import { StoredDrawResult } from '../services/indexedDBService';
import { NumberChip } from '../components/NumberChip';
import { toast } from 'sonner-native';

export default function CategoryDetailScreen({ route, navigation }: any) {
  const { category } = route.params;
  const theme = useTheme();
  const { setLoading } = useAppStore();
  const [results, setResults] = useState<StoredDrawResult[]>([]);
  const [activeTab, setActiveTab] = useState<'donnees' | 'consulter' | 'stats' | 'predictions'>('donnees');

  useEffect(() => {
    loadCategoryData();
  }, [category]);

  const loadCategoryData = async () => {
    try {
      setLoading(true);
      const data = await DataService.getDrawResults(category.id);
      setResults(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    const success = await DataService.syncData();
    if (success) {
      await loadCategoryData();
    }
  };

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

  const renderResultItem = ({ item }: { item: StoredDrawResult }) => (
    <View style={[styles.resultCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.resultHeader}>
        <Text style={[styles.resultDate, { color: theme.colors.text }]}>
          {new Date(item.date).toLocaleDateString('fr-FR')}
        </Text>
        <View style={styles.resultType}>
          <Text style={[styles.resultTypeText, { color: theme.colors.primary }]}>
            Gagnants
          </Text>
        </View>
      </View>
      
      <View style={styles.numbersContainer}>
        {item.gagnants.map((number, index) => (
          <NumberChip key={index} number={number} size="medium" />
        ))}
      </View>
      
      {item.machine && (
        <>
          <View style={styles.machineHeader}>
            <Text style={[styles.machineLabel, { color: theme.colors.text }]}>
              Machine
            </Text>
          </View>
          <View style={styles.numbersContainer}>
            {item.machine.map((number, index) => (
              <NumberChip key={index} number={number} size="small" />
            ))}
          </View>
        </>
      )}
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'donnees':
        return (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderResultItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="document-outline" size={64} color={theme.colors.border} />
                <Text style={[styles.emptyText, { color: theme.colors.text }]}>
                  Aucune donnée disponible
                </Text>
                <TouchableOpacity
                  style={[styles.syncButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleSync}
                >
                  <Ionicons name="refresh" size={20} color="white" />
                  <Text style={styles.syncButtonText}>Synchroniser</Text>
                </TouchableOpacity>
              </View>
            }
          />
        );
      
      case 'consulter':
        return (
          <View style={styles.comingSoon}>
            <Ionicons name="search" size={64} color={theme.colors.border} />
            <Text style={[styles.comingSoonText, { color: theme.colors.text }]}>
              Module de consultation en cours de développement
            </Text>
          </View>
        );
      
      case 'stats':
        return (
          <View style={styles.comingSoon}>
            <Ionicons name="stats-chart" size={64} color={theme.colors.border} />
            <Text style={[styles.comingSoonText, { color: theme.colors.text }]}>
              Statistiques avancées bientôt disponibles
            </Text>
          </View>
        );
      
      case 'predictions':
        return (
          <View style={styles.comingSoon}>
            <Ionicons name="bulb" size={64} color={theme.colors.border} />
            <Text style={[styles.comingSoonText, { color: theme.colors.text }]}>
              Prédictions IA en cours d'implémentation
            </Text>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={[styles.categoryTitle, { color: theme.colors.text }]}>
            {category.label}
          </Text>
          <Text style={[styles.categorySubtitle, { color: theme.colors.text }]}>
            {category.dayName} à {category.time}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.syncIconButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSync}
        >
          <Ionicons name="refresh" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {renderTabButton('donnees', 'Données', 'list')}
        {renderTabButton('consulter', 'Consulter', 'search')}
        {renderTabButton('stats', 'Statistiques', 'stats-chart')}
        {renderTabButton('predictions', 'Prédictions', 'bulb')}
      </ScrollView>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>
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
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  categorySubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  syncIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    maxHeight: 60,
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
  },
  listContainer: {
    padding: 16,
  },
  resultCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultType: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  numbersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 8,
  },
  machineHeader: {
    marginTop: 16,
    marginBottom: 8,
  },
  machineLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  comingSoonText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
});