import React from 'react';
import { Pressable, StyleProp, ViewStyle, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface InteractivePressableProps {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  disabled?: boolean;
}

export function InteractivePressable({
  onPress,
  children,
  style,
  scaleTo = 0.96,
  disabled = false,
}: InteractivePressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(scaleTo, {
      damping: 12,
      stiffness: 220,
      mass: 0.8,
    });
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, {
      damping: 12,
      stiffness: 220,
      mass: 0.8,
    });
  };

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[style, animatedStyle]}
      android_ripple={Platform.OS === 'android' ? { color: 'rgba(0,0,0,0.1)', borderless: false } : undefined}
    >
      {children}
    </AnimatedPressable>
  );
}
