import React, { useRef, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
  Image,
  Easing,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Leaf, Camera, Sparkles, ArrowRight } from 'lucide-react-native';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    icon: Leaf,
    title: 'Discover Your Green World',
    description: 'Snap a photo and instantly identify any plant with AI-powered technology.',
    color: '#2D5016',
    image: 'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=800&h=1200&fit=crop',
  },
  {
    id: 2,
    icon: Camera,
    title: 'Expert Plant Care',
    description: 'Get personalized care guides and watering schedules for every plant.',
    color: '#7CB342',
    image: 'https://images.unsplash.com/photo-1459156212016-c812468e2115?w=800&h=1200&fit=crop',
  },
  {
    id: 3,
    icon: Sparkles,
    title: 'Your Digital Garden',
    description: 'Build your collection, track growth, and watch your garden thrive.',
    color: '#8D6E63',
    image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&h=1200&fit=crop',
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<any>(null);
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const slideOpacity = useRef(new Animated.Value(0)).current;
  const slideTranslateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(slideOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [logoScale, logoRotate, slideOpacity, slideTranslateY]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideTranslateY, {
        toValue: 30,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(slideOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [currentIndex, slideOpacity, slideTranslateY]);

  const handleNext = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    } else {
      try {
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
        setTimeout(() => {
          router.replace('/auth' as any);
        }, 100);
      } catch (error) {
        console.error('Error completing onboarding:', error);
      }
    }
  };

  const handleSkip = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      setTimeout(() => {
        router.replace('/auth' as any);
      }, 100);
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };

  const logoRotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View
        style={[
          styles.logoHeader,
          {
            transform: [
              { scale: logoScale },
              { rotate: logoRotateInterpolate },
            ],
          },
        ]}
      >
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: false,
            listener: (event: any) => {
              const offsetX = event.nativeEvent.contentOffset.x;
              const index = Math.round(offsetX / width);
              setCurrentIndex(index);
            },
          }
        )}
        scrollEventThrottle={16}
      >
        {slides.map((slide) => (
          <Animated.View 
            key={slide.id} 
            style={[
              styles.slide, 
              { 
                width,
                opacity: slideOpacity,
                transform: [{ translateY: slideTranslateY }],
              }
            ]}
          >
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: slide.image }}
                style={styles.slideImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay} />
              <View style={[styles.iconBadge, { backgroundColor: slide.color }]}>
                <slide.icon size={40} color={Colors.white} strokeWidth={2} />
              </View>
            </View>
            <View style={styles.contentContainer}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </View>
          </Animated.View>
        ))}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity,
                  },
                ]}
              />
            );
          })}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.nextButtonText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <ArrowRight size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  logoHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  logo: {
    width: 80,
    height: 80,
  },
  skipButton: {
    position: 'absolute',
    top: 70,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.gray.dark,
  },
  slide: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  imageContainer: {
    width: '100%',
    height: '60%',
    position: 'relative',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -30,
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.black,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 16,
    color: Colors.gray.dark,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  nextButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
