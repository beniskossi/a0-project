import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

interface TrendPoint {
  date: string;
  value: number;
}

interface TrendChartProps {
  data: TrendPoint[];
  height?: number;
  color?: string;
  showPoints?: boolean;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  height = 200,
  color,
  showPoints = true,
}) => {
  const theme = useTheme();
  const { width: screenWidth } = Dimensions.get('window');
  const chartWidth = screenWidth - 32;
  const chartHeight = height;
  const lineColor = color || theme.colors.primary;
  
  if (data.length < 2) {
    return (
      <View style={[styles.container, { height: chartHeight }]}>
        <SvgText
          x={chartWidth / 2}
          y={chartHeight / 2}
          fontSize={16}
          fill={theme.colors.text}
          textAnchor="middle"
        >
          Données insuffisantes
        </SvgText>
      </View>
    );
  }
  
  const minValue = Math.min(...data.map(d => d.value));
  const maxValue = Math.max(...data.map(d => d.value));
  const valueRange = maxValue - minValue || 1;
  
  const getX = (index: number) => (index / (data.length - 1)) * (chartWidth - 40) + 20;
  const getY = (value: number) => chartHeight - 40 - ((value - minValue) / valueRange) * (chartHeight - 80);
  
  // Créer le chemin de la ligne
  const pathData = data.map((point, index) => {
    const x = getX(index);
    const y = getY(point.value);
    return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');
  
  return (
    <View style={styles.container}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Grille horizontale */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = chartHeight - 40 - (ratio * (chartHeight - 80));
          const value = minValue + (ratio * valueRange);
          return (
            <React.Fragment key={index}>
              <Line
                x1={20}
                y1={y}
                x2={chartWidth - 20}
                y2={y}
                stroke={theme.colors.border}
                strokeWidth={0.5}
                opacity={0.3}
              />
              <SvgText
                x={10}
                y={y + 4}
                fontSize={10}
                fill={theme.colors.text}
                textAnchor="end"
              >
                {Math.round(value)}
              </SvgText>
            </React.Fragment>
          );
        })}
        
        {/* Ligne de tendance */}
        <Path
          d={pathData}
          stroke={lineColor}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Points de données */}
        {showPoints && data.map((point, index) => (
          <Circle
            key={index}
            cx={getX(index)}
            cy={getY(point.value)}
            r={4}
            fill={lineColor}
            stroke="white"
            strokeWidth={2}
          />
        ))}
        
        {/* Labels des dates (échantillonnés) */}
        {data.filter((_, index) => index % Math.ceil(data.length / 5) === 0).map((point, index, filteredData) => {
          const originalIndex = data.findIndex(d => d.date === point.date);
          const x = getX(originalIndex);
          return (
            <SvgText
              key={point.date}
              x={x}
              y={chartHeight - 10}
              fontSize={9}
              fill={theme.colors.text}
              textAnchor="middle"
              transform={`rotate(-45, ${x}, ${chartHeight - 10})`}
            >
              {new Date(point.date).toLocaleDateString('fr-FR', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});