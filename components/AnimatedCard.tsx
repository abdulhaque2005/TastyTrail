import React from 'react';
import { Pressable, PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedCardProps extends PressableProps {
    children: React.ReactNode;
}

export default function AnimatedCard({ children, ...props }: AnimatedCardProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <AnimatedPressable
            {...props}
            style={[animatedStyle, props.style as any]}
            onPressIn={(e) => {
                scale.value = withSpring(0.97, { damping: 15, stiffness: 200 });
                if (props.onPressIn) props.onPressIn(e);
            }}
            onPressOut={(e) => {
                scale.value = withSpring(1, { damping: 15, stiffness: 200 });
                if (props.onPressOut) props.onPressOut(e);
            }}
        >
            {children}
        </AnimatedPressable>
    );
}
