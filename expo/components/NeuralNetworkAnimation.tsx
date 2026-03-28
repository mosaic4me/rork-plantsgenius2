import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import Colors from '@/constants/colors';

const { width, height } = Dimensions.get('window');

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export default function NeuralNetworkAnimation() {
  const nodes = useRef<Node[]>([]);
  const animatedValues = useRef<Animated.Value[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const nodeCount = 20;
    nodes.current = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height * 0.6 + height * 0.2,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
    }));

    animatedValues.current = nodes.current.map(() => new Animated.Value(0));

    Animated.stagger(
      50,
      animatedValues.current.map((anim) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        )
      )
    ).start();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const renderConnections = () => {
    const connections: React.ReactElement[] = [];
    const maxDistance = 150;

    for (let i = 0; i < nodes.current.length; i++) {
      for (let j = i + 1; j < nodes.current.length; j++) {
        const dx = nodes.current[i].x - nodes.current[j].x;
        const dy = nodes.current[i].y - nodes.current[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < maxDistance) {
          const opacity = 1 - distance / maxDistance;
          connections.push(
            <Line
              key={`${i}-${j}`}
              x1={nodes.current[i].x}
              y1={nodes.current[i].y}
              x2={nodes.current[j].x}
              y2={nodes.current[j].y}
              stroke={Colors.accent}
              strokeWidth={1}
              opacity={opacity * 0.3}
            />
          );
        }
      }
    }

    return connections;
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Svg width={width} height={height} style={styles.svg}>
        {renderConnections()}
        {nodes.current.map((node, index) => (
          <Circle
            key={index}
            cx={node.x}
            cy={node.y}
            r={4}
            fill={Colors.primary}
            opacity={0.8}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
});
