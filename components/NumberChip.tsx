import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getNumberColor, getNumberTextColor } from '../constants/drawSchedule';

interface NumberChipProps {
  number: number;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export const NumberChip: React.FC<NumberChipProps> = ({ 
  number, 
  size = 'medium',
  style 
}) => {
  const backgroundColor = getNumberColor(number);
  const textColor = getNumberTextColor(number);
  
  const sizeStyles = {
    small: { width: 32, height: 32, fontSize: 14 },
    medium: { width: 40, height: 40, fontSize: 16 },
    large: { width: 48, height: 48, fontSize: 18 },
  };
  
  const currentSize = sizeStyles[size];
  
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor,
          width: currentSize.width,
          height: currentSize.height,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: textColor,
            fontSize: currentSize.fontSize,
          },
        ]}
      >
        {number}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  text: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});