import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { Camera, Leaf, TrendingUp, Sparkles, ArrowRight, BookOpen, Users } from 'lucide-react-native';
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { POPULAR_PLANTS } from '@/constants/popularPlants';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { stats, history } = useApp();
  const { user, profile, dailyScansRemaining, hasActiveSubscription } = useAuth();

  const handleScanPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/scan' as any);
  };

  const handleHistoryPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/history' as any);
  };

  const handleGardenPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/garden' as any);
  };

  const recentScans = history.slice(0, 3);
  const popularPlantsToShow = POPULAR_PLANTS.slice(0, 3);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.fullName || profile?.full_name || 'Plant Enthusiast'}!</Text>
          </View>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://r2-pub.rork.com/generated-images/b52b2347-5e0a-4a18-9102-7b8a756bf443.png' }}
              style={styles.avatarLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        {!hasActiveSubscription() && (
          <TouchableOpacity 
            style={styles.scansCard}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              router.push('/profile' as any);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.scansInfo}>
              <Sparkles size={24} color={Colors.accent} />
              <View style={styles.scansText}>
                <Text style={styles.scansCount}>{dailyScansRemaining} free scans left today</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.scanButton} onPress={handleScanPress} activeOpacity={0.9}>
          <View style={styles.scanButtonContent}>
            <View style={styles.scanButtonIcon}>
              <Camera size={32} color={Colors.white} />
            </View>
            <View style={styles.scanButtonText}>
              <Text style={styles.scanButtonTitle}>Scan a Plant</Text>
              <Text style={styles.scanButtonSubtitle}>Identify any plant instantly</Text>
            </View>
            <ArrowRight size={24} color={Colors.white} />
          </View>
        </TouchableOpacity>

        <View style={styles.statsContainer}>
          <StatCard
            icon={<TrendingUp size={24} color={Colors.primary} />}
            value={stats.totalScans.toString()}
            label="Plants Scanned"
            onPress={handleHistoryPress}
          />
          <StatCard
            icon={<Leaf size={24} color={Colors.accent} />}
            value={stats.plantsInGarden.toString()}
            label="In Your Garden"
            onPress={handleGardenPress}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Plants</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Explore</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.popularList}
            pagingEnabled={false}
            decelerationRate="fast"
            snapToInterval={width * 0.7 + 16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
          >
            {popularPlantsToShow.map((plant) => (
              <TouchableOpacity
                key={plant.id}
                style={styles.popularCard}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  Toast.show({
                    type: 'info',
                    text1: plant.name,
                    text2: plant.description,
                    position: 'top',
                    visibilityTime: 3000,
                  });
                }}
                activeOpacity={0.8}
              >
                <Image source={{ uri: plant.imageUrl }} style={styles.popularImage} />
                <View style={styles.popularOverlay}>
                  <View style={[styles.difficultyBadge, { 
                    backgroundColor: plant.difficulty === 'Easy' ? Colors.success : 
                                   plant.difficulty === 'Medium' ? Colors.warning : Colors.error 
                  }]}>
                    <Text style={styles.difficultyText}>{plant.difficulty}</Text>
                  </View>
                </View>
                <View style={styles.popularInfo}>
                  <Text style={styles.popularName} numberOfLines={1}>
                    {plant.name}
                  </Text>
                  <Text style={styles.popularDescription} numberOfLines={2}>
                    {plant.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {recentScans.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Scans</Text>
              <TouchableOpacity onPress={handleHistoryPress}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentList}>
              {recentScans.map((plant) => (
                <TouchableOpacity
                  key={plant.id}
                  style={styles.recentCard}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    router.push({
                      pathname: '/results' as any,
                      params: { imageUri: plant.imageUri },
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: plant.imageUri }} style={styles.recentImage} />
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentName} numberOfLines={1}>
                      {plant.commonName}
                    </Text>
                    <Text style={styles.recentScientific} numberOfLines={1}>
                      {plant.scientificName}
                    </Text>
                    <View style={styles.recentBadge}>
                      <Text style={styles.recentBadgeText}>{plant.confidence}% match</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discover</Text>
          
          <View style={styles.discoverGrid}>
            <DiscoverCard
              icon={<BookOpen size={28} color={Colors.primary} />}
              title="Plant Care Guide"
              description="Expert tips for healthy plants"
              color="#E8F5E9"
            />
            <DiscoverCard
              icon={<Users size={28} color={Colors.accent} />}
              title="Community"
              description="Connect with plant lovers (Coming Soon)"
              color="#FFF3E0"
            />
          </View>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Why PlantGenius?</Text>
          <FeatureItem 
            icon="🔍" 
            title="Instant Identification" 
            description="Identify any plant in seconds with AI-powered recognition"
          />
          <FeatureItem 
            icon="📚" 
            title="Comprehensive Database" 
            description="Access information on over 10,000+ plant species"
          />
          <FeatureItem 
            icon="🌱" 
            title="Care Reminders" 
            description="Never forget to water your plants again"
          />
          <FeatureItem 
            icon="🏆" 
            title="Expert Advice" 
            description="Get personalized care tips from botanists"
          />
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 Pro Tip</Text>
          <Text style={styles.tipText}>
            For best results, take photos in natural daylight and ensure the plant is in focus.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.statIcon}>
        <Text>{icon}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function DiscoverCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <TouchableOpacity style={[styles.discoverCard, { backgroundColor: color }]} activeOpacity={0.8}>
      <View style={styles.discoverIcon}>
        <Text>{icon}</Text>
      </View>
      <Text style={styles.discoverTitle}>{title}</Text>
      <Text style={styles.discoverDescription}>{description}</Text>
    </TouchableOpacity>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: Colors.gray.dark,
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.black,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    padding: 4,
  },
  avatarLogo: {
    width: 48,
    height: 48,
  },
  scansCard: {
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  scansInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scansText: {
    flex: 1,
  },
  scansCount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 2,
  },
  scansSubtext: {
    fontSize: 13,
    color: Colors.gray.dark,
  },
  scanButton: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  scanButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  scanButtonIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButtonText: {
    flex: 1,
  },
  scanButtonTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 4,
  },
  scanButtonSubtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.gray.dark,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.black,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  recentList: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  recentCard: {
    width: 160,
    marginRight: 16,
    borderRadius: 16,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recentImage: {
    width: '100%',
    height: 160,
  },
  recentInfo: {
    padding: 12,
  },
  recentName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  recentScientific: {
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.gray.dark,
    marginBottom: 8,
  },
  recentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recentBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  discoverGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  discoverCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    minHeight: 140,
  },
  discoverIcon: {
    marginBottom: 12,
  },
  discoverTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 6,
  },
  discoverDescription: {
    fontSize: 13,
    color: Colors.gray.dark,
    lineHeight: 18,
  },
  tipCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFF9C4',
    borderWidth: 1,
    borderColor: '#FFF176',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: Colors.gray.dark,
    lineHeight: 20,
  },
  popularList: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  popularCard: {
    width: width * 0.7,
    marginRight: 16,
    borderRadius: 20,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  popularImage: {
    width: '100%',
    height: 200,
  },
  popularOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  popularInfo: {
    padding: 16,
  },
  popularName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 6,
  },
  popularDescription: {
    fontSize: 14,
    color: Colors.gray.dark,
    lineHeight: 20,
  },
  featuresSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: Colors.gray.dark,
    lineHeight: 20,
  },
});
