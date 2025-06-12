import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawCategory } from '../types';
import { useTheme } from '../hooks/useTheme';

interface DrawCategoryCardProps {
  category: DrawCategory;
  onPress: () => void;
  resultsCount?: number;
}

export const DrawCategoryCard: React.FC<DrawCategoryCardProps> = ({
  category,
  onPress,
  resultsCount = 0,
}) => {
  const theme = useTheme();

  const getDayIcon = (day: number) => {
    const icons = ['sunny', 'moon', 'star', 'flash', 'heart', 'diamond', 'leaf'];
    return icons[day] as keyof typeof Ionicons.glyphMap;
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons
            name={getDayIcon(category.day)}
            size={24}
            color={theme.colors.primary}
          />
          <View style={styles.textContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {category.label}
            </Text>
            <Text style={[styles.schedule, { color: theme.colors.text }]}>
              {category.dayName} à {category.time}
            </Text>
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.primary}
        />
      </View>
      
      <View style={styles.footer}>
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
            {resultsCount} résultats
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    margin: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  schedule: {
    fontSize: 14,
    opacity: 0.7,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});