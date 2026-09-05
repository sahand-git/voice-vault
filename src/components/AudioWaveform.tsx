import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface AudioWaveformProps {
  isRecording: boolean;
  isPaused: boolean;
  metering?: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ isRecording, isPaused, metering = -50 }) => {
  const bars = [
    useRef(new Animated.Value(8)).current,
    useRef(new Animated.Value(14)).current,
    useRef(new Animated.Value(24)).current,
    useRef(new Animated.Value(36)).current,
    useRef(new Animated.Value(48)).current,
    useRef(new Animated.Value(32)).current,
    useRef(new Animated.Value(18)).current,
    useRef(new Animated.Value(10)).current,
  ];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        // Metering is typically between -160 (silence) and 0 (loudest)
        const normalized = Math.max(0.15, Math.min(1, (metering + 100) / 100));
        
        bars.forEach((anim, idx) => {
          const randomFactor = 0.5 + Math.random() * 0.5;
          const targetHeight = Math.max(6, 60 * normalized * randomFactor * ((idx % 3 + 1) / 2));
          Animated.timing(anim, {
            toValue: targetHeight,
            duration: 90,
            useNativeDriver: false,
          }).start();
        });
      }, 100);
    } else {
      bars.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 6,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, isPaused, metering]);

  return (
    <View style={styles.container}>
      {bars.map((anim, idx) => (
        <Animated.View
          key={idx}
          style={[
            styles.bar,
            {
              height: anim,
              backgroundColor: isRecording
                ? isPaused
                  ? '#F59E0B'
                  : '#10B981'
                : '#334155',
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 70,
    gap: 6,
    marginVertical: 16,
  },
  bar: {
    width: 6,
    borderRadius: 3,
  },
});
