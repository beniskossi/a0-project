import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { NumberFrequency } from '../../types';

interface FrequencyChartProps {
  data: NumberFrequency[];
  height?: number;
}

export const FrequencyChart: React.FC<FrequencyChartProps> = ({ 
  data, 
  height = 300 
}) => {
  const theme = useTheme();
  const { width: screenWidth } = Dimensions.get('window');
  const chartWidth = screenWidth - 32;
  const chartHeight = height;
  
  const maxCount = Math.max(...data.map(d => d.count));
  const barWidth = chartWidth / data.length;
  
  return (
    <View style={styles.container}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Grille horizontale */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = chartHeight - (ratio * (chartHeight - 40));
          return (
            <Line
              key={index}
              x1={0}
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke={theme.colors.border}
              strokeWidth={0.5}
              opacity={0.3}
            />
          );
        })}
        
        {/* Barres */}
        {data.map((item, index) => {
          const barHeight = (item.count / maxCount) * (chartHeight - 40);
          const x = index * barWidth;
          const y = chartHeight - barHeight - 20;
          
          return (
            <React.Fragment key={item.number}>
              <Rect
                x={x + 2}
                y={y}
                width={barWidth - 4}
                height={barHeight}
                fill={theme.colors.primary}
                opacity={0.8}
                rx={2}
              />
              
              {/* Numéro en bas */}
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight - 5}
                fontSize={10}
                fill={theme.colors.text}
                textAnchor="middle"
              >
                {item.number}
              </SvgText>
              
              {/* Valeur au-dessus de la barre */}
              {barHeight > 20 && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 5}
                  fontSize={9}
                  fill={theme.colors.text}
                  textAnchor="middle"
                >
                  {item.count}
                </SvgText>
              )}
            </React.Fragment>
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