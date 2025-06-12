import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { DRAW_CATEGORIES } from '../constants/drawSchedule';
import { DrawCategoryCard } from '../components/DrawCategoryCard';

export default function HomeScreen({ navigation }: any) {
  const theme = useTheme();
  const { toggleTheme, selectedCategory, setSelectedCategory } = useAppStore();  const handleCategoryPress = (category: any) => {
    setSelectedCategory(category);
    navigation.navigate('CategoryDetail', { category });
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
      <View style={styles.headerContent}>
        <View>
          <Text style={[styles.welcomeText, { color: theme.colors.text }]}>
            Bienvenue sur
          </Text>
          <Text style={[styles.appTitle, { color: theme.colors.primary }]}>
            LotoAnalyzer Pro
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text }]}>
            Analyse intelligente des tirages de loterie
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.themeButton, { backgroundColor: theme.colors.primary }]}
          onPress={toggleTheme}
        >
          <Ionicons
            name={theme.mode === 'light' ? 'moon' : 'sunny'}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDaySection = (dayName: string, categories: any[]) => (
    <View key={dayName} style={styles.daySection}>
      <Text style={[styles.dayTitle, { color: theme.colors.primary }]}>
        {dayName}
      </Text>
      {categories.map((category) => (
        <DrawCategoryCard
          key={category.id}
          category={category}
          onPress={() => handleCategoryPress(category)}
          resultsCount={Math.floor(Math.random() * 100)} // Mock data
        />
      ))}
    </View>
  );

  const groupedCategories = DRAW_CATEGORIES.reduce((acc, category) => {
    if (!acc[category.dayName]) {
      acc[category.dayName] = [];
    }
    acc[category.dayName].push(category);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderHeader()}
      
      <FlatList
        data={Object.entries(groupedCategories)}
        keyExtractor={([dayName]) => dayName}
        renderItem={({ item: [dayName, categories] }) =>
          renderDaySection(dayName, categories)
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    opacity: 0.7,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  themeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  daySection: {
    marginVertical: 8,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 16,
  },
});