import React from 'react';
import { View, Dimensions, StyleSheet, Text, ScrollView } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { getNumberColor } from '../../constants/drawSchedule';

interface HeatMapData {
  number: number;
  frequency: number;
  lastWeeks: number[]; // Fréquence par semaine sur les 10 dernières semaines
}

interface HeatMapChartProps {
  data: HeatMapData[];
  title?: string;
}

export const HeatMapChart: React.FC<HeatMapChartProps> = ({ 
  data, 
  title = "Carte de Chaleur des Fréquences" 
}) => {
  const theme = useTheme();
  const { width: screenWidth } = Dimensions.get('window');
  
  const cellSize = 30;
  const cols = 10; // 10 semaines
  const rows = Math.ceil(90 / 9); // 90 numéros, 9 par ligne pour lisibilité
  const chartWidth = cols * cellSize + 60; // +60 pour les labels
  const chartHeight = rows * cellSize + 40;
  
  const maxFreq = Math.max(...data.flatMap(d => d.lastWeeks));
  
  const getHeatColor = (frequency: number): string => {
    if (frequency === 0) return theme.colors.background;
    const intensity = frequency / maxFreq;
    const alpha = Math.max(0.1, intensity);
    return theme.colors.primary + Math.floor(alpha * 255).toString(16).padStart(2, '0');
  };
  
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Svg width={chartWidth} height={chartHeight}>
            {/* Headers des semaines */}
            {Array.from({ length: cols }, (_, weekIndex) => (
              <SvgText
                key={`week-${weekIndex}`}
                x={60 + weekIndex * cellSize + cellSize / 2}
                y={15}
                fontSize={10}
                fill={theme.colors.text}
                textAnchor="middle"
              >
                S-{weekIndex + 1}
              </SvgText>
            ))}
            
            {/* Grille de données */}
            {data.slice(0, 90).map((item, numberIndex) => {
              const row = Math.floor(numberIndex / 9);
              const baseY = row * cellSize + 25;
              
              return (
                <React.Fragment key={item.number}>
                  {/* Label du numéro */}
                  <SvgText
                    x={30}
                    y={baseY + cellSize / 2 + 4}
                    fontSize={12}
                    fill={theme.colors.text}
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {item.number}
                  </SvgText>
                  
                  {/* Cellules de fréquence par semaine */}
                  {item.lastWeeks.map((freq, weekIndex) => (
                    <Rect
                      key={`${item.number}-${weekIndex}`}
                      x={60 + weekIndex * cellSize}
                      y={baseY}
                      width={cellSize - 1}
                      height={cellSize - 1}
                      fill={getHeatColor(freq)}
                      stroke={theme.colors.border}
                      strokeWidth={0.5}
                      rx={2}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </Svg>
        </ScrollView>
      </ScrollView>
      
      {/* Légende */}
      <View style={styles.legend}>
        <Text style={[styles.legendTitle, { color: theme.colors.text }]}>
          Intensité:
        </Text>
        <View style={styles.legendItems}>
          {[0, 0.25, 0.5, 0.75, 1].map((intensity, index) => (
            <View key={index} style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: getHeatColor(intensity * maxFreq) },
                ]}
              />
              <Text style={[styles.legendText, { color: theme.colors.text }]}>
                {Math.round(intensity * maxFreq)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  legend: {
    marginTop: 16,
    alignItems: 'center',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendItem: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginBottom: 4,
  },
  legendText: {
    fontSize: 10,
  },
});