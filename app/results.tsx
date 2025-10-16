import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { ArrowLeft, Bookmark, Share2, Download, AlertTriangle, Droplets, Sun, Sprout, Info, ExternalLink } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useApp } from '@/contexts/AppContext';
import type { PlantIdentification } from '@/types/plant';
import Colors from '@/constants/colors';
import InterstitialAd from '@/components/InterstitialAd';
import AdBanner from '@/components/AdBanner';

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ imageUri: string; plantData?: string }>();
  const { history, toggleSaved } = useApp();
  const [plant, setPlant] = useState<PlantIdentification | null>(null);
  const [showInterstitial, setShowInterstitial] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.plantData) {
      try {
        const plantData = JSON.parse(params.plantData);
        setPlant(plantData);
      } catch (error) {
        console.error('Error parsing plant data:', error);
      }
    } else if (params.imageUri) {
      const foundPlant = history.find(p => p.imageUri === params.imageUri);
      if (foundPlant) {
        setPlant(foundPlant);
      }
    }
  }, [params.plantData, params.imageUri, history]);

  if (!plant) {
    return null;
  }

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleToggleSaved = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleSaved(plant.id);
    setPlant({ ...plant, saved: !plant.saved });
  };

  const handleShare = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const shareText = `🌿 ${plant.commonName}\n\nScientific Name: ${plant.scientificName}\nFamily: ${plant.family || 'Unknown'}\nConfidence: ${plant.confidence}%\n\n${plant.description || ''}\n\nIdentified with PlantGenius`;
      
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: plant.commonName,
            text: shareText,
          });
        } else {
          await navigator.clipboard.writeText(shareText);
          Toast.show({
            type: 'success',
            text1: 'Copied to Clipboard',
            text2: 'Plant details copied successfully',
            position: 'top',
          });
        }
      } else {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          const tempFile = `${FileSystem.cacheDirectory}plant_info.txt`;
          await FileSystem.writeAsStringAsync(tempFile, shareText);
          await Sharing.shareAsync(tempFile, {
            mimeType: 'text/plain',
            dialogTitle: `Share ${plant.commonName}`,
          });
        }
      }
    } catch (error: any) {
      console.error('Error sharing:', error);
      Toast.show({
        type: 'error',
        text1: 'Share Failed',
        text2: error.message || 'Could not share plant details',
        position: 'top',
      });
    }
  };

  const handleSaveToDevice = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setSaving(true);
    try {
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = plant.imageUri;
        link.download = `${plant.commonName.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Toast.show({
          type: 'success',
          text1: 'Download Started',
          text2: 'Image is being downloaded',
          position: 'top',
        });
      } else {
        console.log('[Download] Requesting storage permission...');
        const { status } = await MediaLibrary.requestPermissionsAsync();
        
        if (status !== 'granted') {
          console.log('[Download] Permission denied:', status);
          Toast.show({
            type: 'error',
            text1: 'Storage Permission Required',
            text2: 'Please allow storage access in your device settings to download images',
            position: 'top',
            visibilityTime: 5000,
          });
          return;
        }

        console.log('[Download] Permission granted, saving image...');
        const asset = await MediaLibrary.createAssetAsync(plant.imageUri);
        await MediaLibrary.createAlbumAsync('PlantGenius', asset, false);
        console.log('[Download] Image saved successfully');
        
        Toast.show({
          type: 'success',
          text1: 'Saved Successfully',
          text2: 'Image saved to PlantGenius album',
          position: 'top',
        });
      }
    } catch (error: any) {
      console.error('Error saving to device:', error);
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: error.message || 'Could not save image',
        position: 'top',
      });
    } finally {
      setSaving(false);
    }
  };

  const getCareColor = (level: string) => {
    switch (level) {
      case 'Beginner':
        return Colors.success;
      case 'Intermediate':
        return Colors.warning;
      case 'Expert':
        return Colors.error;
      default:
        return Colors.gray.medium;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Image source={{ uri: plant.imageUri }} style={styles.heroImage} />
          
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <ArrowLeft size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroOverlay}>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>{plant.confidence}%</Text>
              <Text style={styles.confidenceLabel}>Match</Text>
            </View>
            
            <View style={styles.plantNameContainer}>
              <Text style={styles.scientificName}>{plant.scientificName}</Text>
              <Text style={styles.commonName}>{plant.commonName}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, plant.saved && styles.actionButtonActive]} 
            onPress={handleToggleSaved}
          >
            <Bookmark 
              size={20} 
              color={plant.saved ? Colors.white : Colors.primary} 
              fill={plant.saved ? Colors.white : 'transparent'}
            />
            <Text style={[styles.actionButtonText, plant.saved && styles.actionButtonTextActive]}>
              {plant.saved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Share2 size={20} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, saving && styles.actionButtonDisabled]} 
            onPress={handleSaveToDevice}
            disabled={saving}
          >
            <Download size={20} color={Colors.primary} />
            <Text style={styles.actionButtonText}>
              {saving ? 'Saving...' : 'Download'}
            </Text>
          </TouchableOpacity>
        </View>

        <AdBanner />

        <View style={styles.cardsContainer}>
          <InfoCard title="Identification">
            <View style={styles.taxonomyContainer}>
              <TaxonomyItem label="Common Name" value={plant.commonName} />
              <TaxonomyItem label="Scientific Name" value={plant.scientificName} />
              {plant.author && <TaxonomyItem label="Author" value={plant.author} />}
              <TaxonomyItem label="Family" value={plant.family || 'Unknown'} />
              <TaxonomyItem label="Genus" value={plant.genus || 'Unknown'} />
              <TaxonomyItem label="Species" value={plant.species || 'Unknown'} />
            </View>

            {plant.description && (
              <Text style={styles.description}>{plant.description}</Text>
            )}

            {plant.taxonomy && (
              <View style={styles.taxonomySection}>
                <Text style={styles.sectionTitle}>Full Taxonomy</Text>
                <View style={styles.taxonomyGrid}>
                  {plant.taxonomy.kingdom && <TaxonomyBadge label="Kingdom" value={plant.taxonomy.kingdom} />}
                  {plant.taxonomy.phylum && <TaxonomyBadge label="Phylum" value={plant.taxonomy.phylum} />}
                  {plant.taxonomy.class && <TaxonomyBadge label="Class" value={plant.taxonomy.class} />}
                  {plant.taxonomy.order && <TaxonomyBadge label="Order" value={plant.taxonomy.order} />}
                  {plant.taxonomy.family && <TaxonomyBadge label="Family" value={plant.taxonomy.family} />}
                  {plant.taxonomy.genus && <TaxonomyBadge label="Genus" value={plant.taxonomy.genus} />}
                </View>
              </View>
            )}

            {plant.synonyms && plant.synonyms.length > 0 && (
              <View style={styles.synonymsSection}>
                <Text style={styles.sectionTitle}>Synonyms</Text>
                <Text style={styles.synonymsText}>{plant.synonyms.join(', ')}</Text>
              </View>
            )}

            {plant.gbifId && (
              <View style={styles.externalLinkContainer}>
                <ExternalLink size={16} color={Colors.primary} />
                <Text style={styles.externalLinkText}>GBIF ID: {plant.gbifId}</Text>
              </View>
            )}

            {plant.referenceImages && plant.referenceImages.length > 0 && (
              <View style={styles.similarSection}>
                <Text style={styles.sectionTitle}>Reference Images</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {plant.referenceImages.map((img, index) => (
                    <View key={index} style={styles.similarCard}>
                      <Image source={{ uri: img.url }} style={styles.similarImage} />
                      <Text style={styles.similarName}>{img.organ}</Text>
                      <Text style={styles.similarDiff}>{img.author}</Text>
                      <Text style={styles.licenseText}>{img.license}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {plant.similarSpecies && plant.similarSpecies.length > 0 && (
              <View style={styles.similarSection}>
                <Text style={styles.sectionTitle}>Similar Species</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {plant.similarSpecies.map((similar, index) => (
                    <View key={index} style={styles.similarCard}>
                      {similar.imageUrl ? (
                        <Image source={{ uri: similar.imageUrl }} style={styles.similarImage} />
                      ) : (
                        <View style={[styles.similarImage, styles.placeholderImage]}>
                          <Info size={32} color={Colors.gray.medium} />
                        </View>
                      )}
                      <Text style={styles.similarName}>{similar.name}</Text>
                      <Text style={styles.similarDiff}>{similar.difference}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </InfoCard>

          <InfoCard title="Care Requirements">
            <View style={styles.careLevelContainer}>
              <Text style={styles.careLevelLabel}>Difficulty Level</Text>
              <View style={[styles.careLevelBadge, { backgroundColor: getCareColor(plant.careLevel || 'Beginner') }]}>
                <Text style={styles.careLevelText}>{plant.careLevel || 'Beginner'}</Text>
              </View>
            </View>

            <CareItem 
              icon={<Sun size={20} color={Colors.primary} />}
              label="Light"
              value={plant.sunExposure || 'Bright indirect light'}
            />

            <CareItem 
              icon={<Droplets size={20} color={Colors.primary} />}
              label="Water"
              value={plant.wateringSchedule || 'Water when soil is dry'}
            />

            <CareItem 
              icon={<Sprout size={20} color={Colors.primary} />}
              label="Soil"
              value={plant.soilType || 'Well-draining potting mix'}
            />
          </InfoCard>

          <InfoCard title="Safety & Info">
            {plant.toxicity && (
              <View style={styles.toxicityContainer}>
                <View style={styles.toxicityHeader}>
                  <AlertTriangle size={20} color={Colors.error} />
                  <Text style={styles.toxicityTitle}>Pet Safety Warning</Text>
                </View>
                <View style={styles.toxicityGrid}>
                  <ToxicityBadge label="Dogs" toxic={plant.toxicity.dogs} />
                  <ToxicityBadge label="Cats" toxic={plant.toxicity.cats} />
                  <ToxicityBadge label="Horses" toxic={plant.toxicity.horses} />
                </View>
              </View>
            )}

            {plant.edible !== undefined && (
              <InfoRow label="Edible" value={plant.edible ? 'Yes' : 'No'} />
            )}

            {plant.medicinal !== undefined && (
              <InfoRow label="Medicinal Properties" value={plant.medicinal ? 'Yes' : 'No'} />
            )}

            {plant.nativeHabitat && (
              <InfoRow label="Native Habitat" value={plant.nativeHabitat} />
            )}

            {plant.bloomingSeason && plant.bloomingSeason.length > 0 && (
              <InfoRow label="Blooming Season" value={plant.bloomingSeason.join(', ')} />
            )}

            {plant.pollinators && plant.pollinators.length > 0 && (
              <View style={styles.pollinatorsContainer}>
                <Text style={styles.pollinatorsLabel}>Attracts Pollinators</Text>
                <View style={styles.pollinatorsTags}>
                  {plant.pollinators.map((pollinator, index) => (
                    <View key={index} style={styles.pollinatorTag}>
                      <Text style={styles.pollinatorText}>{pollinator}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </InfoCard>
        </View>
      </ScrollView>

      <InterstitialAd 
        visible={showInterstitial} 
        onClose={() => setShowInterstitial(false)}
        duration={15}
      />
    </View>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function TaxonomyItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.taxonomyItem}>
      <Text style={styles.taxonomyLabel}>{label}</Text>
      <Text style={styles.taxonomyValue}>{value}</Text>
    </View>
  );
}

function CareItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.careItem}>
      <View style={styles.careIcon}>{icon}</View>
      <View style={styles.careContent}>
        <Text style={styles.careLabel}>{label}</Text>
        <Text style={styles.careValue}>{value}</Text>
      </View>
    </View>
  );
}

function ToxicityBadge({ label, toxic }: { label: string; toxic: boolean }) {
  return (
    <View style={[styles.toxicityBadge, toxic && styles.toxicityBadgeDanger]}>
      <Text style={[styles.toxicityBadgeText, toxic && styles.toxicityBadgeTextDanger]}>
        {label}: {toxic ? 'Toxic' : 'Safe'}
      </Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function TaxonomyBadge({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.taxonomyBadge}>
      <Text style={styles.taxonomyBadgeLabel}>{label}</Text>
      <Text style={styles.taxonomyBadgeValue}>{value}</Text>
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
  heroSection: {
    width: '100%',
    height: 400,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  confidenceBadge: {
    position: 'absolute',
    top: -60,
    right: 24,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
  },
  confidenceText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  confidenceLabel: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.9,
  },
  plantNameContainer: {
    marginBottom: 8,
  },
  scientificName: {
    fontSize: 20,
    fontStyle: 'italic',
    color: Colors.white,
    marginBottom: 4,
  },
  commonName: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray.light,
    gap: 4,
  },
  actionButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  actionButtonTextActive: {
    color: Colors.white,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  cardsContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 16,
  },
  taxonomyContainer: {
    gap: 12,
    marginBottom: 16,
  },
  taxonomyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray.light,
  },
  taxonomyLabel: {
    fontSize: 14,
    color: Colors.gray.dark,
    fontWeight: '600' as const,
  },
  taxonomyValue: {
    fontSize: 14,
    color: Colors.black,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.gray.dark,
    marginBottom: 16,
  },
  similarSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.black,
    marginBottom: 12,
  },
  similarCard: {
    width: 140,
    marginRight: 12,
  },
  similarImage: {
    width: 140,
    height: 140,
    borderRadius: 12,
    marginBottom: 8,
  },
  similarName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  similarDiff: {
    fontSize: 12,
    color: Colors.gray.dark,
    lineHeight: 16,
  },
  careLevelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray.light,
  },
  careLevelLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.black,
  },
  careLevelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  careLevelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  careItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  careIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  careContent: {
    flex: 1,
  },
  careLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  careValue: {
    fontSize: 14,
    color: Colors.gray.dark,
    lineHeight: 20,
  },
  toxicityContainer: {
    marginBottom: 20,
  },
  toxicityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  toxicityTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  toxicityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toxicityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.gray.light,
  },
  toxicityBadgeDanger: {
    backgroundColor: '#FFEBEE',
  },
  toxicityBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.gray.dark,
  },
  toxicityBadgeTextDanger: {
    color: Colors.error,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray.light,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.gray.dark,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.black,
    flex: 1,
    textAlign: 'right',
  },
  pollinatorsContainer: {
    marginTop: 16,
  },
  pollinatorsLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.black,
    marginBottom: 8,
  },
  pollinatorsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pollinatorTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.accent,
  },
  pollinatorText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  taxonomySection: {
    marginTop: 16,
  },
  taxonomyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  synonymsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray.light,
  },
  synonymsText: {
    fontSize: 14,
    color: Colors.gray.dark,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  externalLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
  },
  externalLinkText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  placeholderImage: {
    backgroundColor: Colors.gray.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  licenseText: {
    fontSize: 10,
    color: Colors.gray.medium,
    marginTop: 2,
  },
  taxonomyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.gray.light,
    minWidth: 100,
  },
  taxonomyBadgeLabel: {
    fontSize: 11,
    color: Colors.gray.dark,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  taxonomyBadgeValue: {
    fontSize: 13,
    color: Colors.black,
    fontWeight: '500' as const,
  },
});
