import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Leaf, Camera, Database, Heart } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function AboutScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About PlantsGenius</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.appName}>PlantsGenius</Text>
          <Text style={styles.version}>Version 1.0.0</Text>

          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionTitle}>Your AI-Powered Plant Companion</Text>
            <Text style={styles.description}>
              PlantsGenius is your ultimate plant identification and care companion, powered by advanced AI technology. With access to information on over 70,000+ plant species, simply snap a photo to instantly identify any plant. Get personalized care guides, watering schedules, and expert tips tailored to your plants. Build your digital garden collection, track growth progress, and receive timely reminders to keep your plants thriving. Whether you're a beginner or seasoned gardener, PlantsGenius makes plant care effortless and enjoyable. Discover, nurture, and watch your green world flourish!
            </Text>
          </View>

          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>Key Features</Text>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Camera size={24} color={Colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureItemTitle}>AI Plant Identification</Text>
                <Text style={styles.featureItemDescription}>
                  Instantly identify plants with a simple photo using cutting-edge AI technology
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Database size={24} color={Colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureItemTitle}>Comprehensive Database</Text>
                <Text style={styles.featureItemDescription}>
                  Access detailed information on over 70,000+ plant species worldwide
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Heart size={24} color={Colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureItemTitle}>Personalized Care Guides</Text>
                <Text style={styles.featureItemDescription}>
                  Get tailored watering schedules, sunlight requirements, and expert care tips
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Leaf size={24} color={Colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureItemTitle}>Digital Garden</Text>
                <Text style={styles.featureItemDescription}>
                  Build your plant collection, track growth, and manage your green space
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.copyrightSection}>
            <Text style={styles.copyrightText}>© 2025 Programmers' Court LTD</Text>
            <Text style={styles.copyrightSubtext}>All rights reserved</Text>
            <Text style={styles.email}>info@programmerscourt.com</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray.light,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.black,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  logoContainer: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logo: {
    width: 100,
    height: 100,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  version: {
    fontSize: 16,
    color: Colors.gray.dark,
    textAlign: 'center',
    marginBottom: 32,
  },
  descriptionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  descriptionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.gray.dark,
    textAlign: 'center',
  },
  featuresSection: {
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureItemTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  featureItemDescription: {
    fontSize: 14,
    color: Colors.gray.dark,
    lineHeight: 20,
  },
  copyrightSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.gray.light,
    marginTop: 24,
  },
  copyrightText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  copyrightSubtext: {
    fontSize: 12,
    color: Colors.gray.dark,
    marginBottom: 8,
  },
  email: {
    fontSize: 12,
    color: Colors.primary,
  },
});
