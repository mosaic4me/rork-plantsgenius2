import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Plus, Droplets, Leaf, AlertCircle, X, History } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';

export default function GardenScreen() {
  const insets = useSafeAreaInsets();
  const { garden, updatePlantWatering, history, addToGarden } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<any>(null);

  const handleWater = (id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    updatePlantWatering(id);
    Toast.show({
      type: 'success',
      text1: 'Plant Watered',
      text2: 'Watering recorded successfully',
      position: 'top',
    });
  };

  const handleViewHistory = (plant: any) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedPlant(plant);
    setShowHistoryModal(true);
  };

  const handleAddPlant = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowAddModal(true);
  };

  const handleAddToGarden = (plantId: string) => {
    const plant = history.find(p => p.id === plantId);
    if (plant) {
      const isAlreadyInGarden = garden.some(g => g.id === plant.id);
      if (isAlreadyInGarden) {
        Toast.show({
          type: 'info',
          text1: 'Already in Garden',
          text2: `${plant.commonName} is already in your garden`,
          position: 'top',
        });
      } else {
        addToGarden(plant);
        Toast.show({
          type: 'success',
          text1: 'Added to Garden',
          text2: `${plant.commonName} added successfully`,
          position: 'top',
        });
      }
      setShowAddModal(false);
    }
  };

  const getDaysUntilWatering = (nextWateringDue?: number) => {
    if (!nextWateringDue) return null;
    const days = Math.ceil((nextWateringDue - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return Colors.success;
      case 'warning':
        return Colors.warning;
      case 'critical':
        return Colors.error;
      default:
        return Colors.gray.medium;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Garden</Text>
          <Text style={styles.subtitle}>{garden.length} plants in your collection</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPlant}>
          <Plus size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {garden.length === 0 ? (
        <View style={styles.emptyState}>
          <Leaf size={64} color={Colors.gray.medium} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>Your Garden is Empty</Text>
          <Text style={styles.emptyText}>
            Add plants to your garden to track their care and health
          </Text>
          <TouchableOpacity style={styles.scanButton} onPress={handleAddPlant}>
            <Plus size={20} color={Colors.white} />
            <Text style={styles.scanButtonText}>Add Your First Plant</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.healthCard}>
            <Text style={styles.healthTitle}>Plant Health Diagnosis</Text>
            <Text style={styles.healthText}>
              Is your plant sick? Upload a photo to diagnose issues
            </Text>
            <TouchableOpacity style={styles.diagnoseButton} onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              Toast.show({
                type: 'info',
                text1: 'Coming Soon',
                text2: 'Plant diagnosis feature will be available soon!',
                position: 'top',
              });
            }}>
              <AlertCircle size={20} color={Colors.primary} />
              <Text style={styles.diagnoseButtonText}>Diagnose Plant</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.plantsContainer}>
            {garden.map((plant) => {
              const daysUntilWatering = getDaysUntilWatering(plant.nextWateringDue);
              const needsWater = daysUntilWatering !== null && daysUntilWatering <= 0;

              return (
                <View key={plant.id} style={styles.plantCard}>
                  <Image source={{ uri: plant.imageUri }} style={styles.plantImage} />
                  
                  <View style={styles.plantContent}>
                    <View style={styles.plantHeader}>
                      <View style={styles.plantTitleContainer}>
                        <Text style={styles.plantName}>{plant.commonName}</Text>
                        <Text style={styles.plantScientific}>{plant.scientificName}</Text>
                      </View>
                      <View
                        style={[
                          styles.healthDot,
                          { backgroundColor: getHealthColor(plant.healthStatus) },
                        ]}
                      />
                    </View>

                    <View style={styles.careInfo}>
                      <View style={styles.careItem}>
                        <Droplets size={16} color={needsWater ? Colors.error : Colors.primary} />
                        <Text style={[styles.careText, needsWater && styles.careTextWarning]}>
                          {needsWater
                            ? 'Water now!'
                            : daysUntilWatering !== null
                            ? `Water in ${daysUntilWatering} days`
                            : 'Set watering schedule'}
                        </Text>
                      </View>

                      {plant.lastWatered && (
                        <Text style={styles.lastWatered}>
                          Last watered: {new Date(plant.lastWatered).toLocaleDateString()}
                        </Text>
                      )}
                    </View>

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.waterButton, needsWater && styles.waterButtonUrgent]}
                        onPress={() => handleWater(plant.id)}
                      >
                        <Droplets size={18} color={Colors.white} />
                        <Text style={styles.waterButtonText}>
                          {needsWater ? 'Water Now' : 'Mark as Watered'}
                        </Text>
                      </TouchableOpacity>
                      {plant.wateringHistory && plant.wateringHistory.length > 0 && (
                        <TouchableOpacity
                          style={styles.historyButton}
                          onPress={() => handleViewHistory(plant)}
                        >
                          <History size={18} color={Colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Plant to Garden</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color={Colors.black} />
              </TouchableOpacity>
            </View>

            {history.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Leaf size={48} color={Colors.gray.medium} />
                <Text style={styles.modalEmptyText}>No plants scanned yet</Text>
                <TouchableOpacity
                  style={styles.modalScanButton}
                  onPress={() => {
                    setShowAddModal(false);
                    router.push('/scan' as any);
                  }}
                >
                  <Text style={styles.modalScanButtonText}>Scan a Plant</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={history}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isInGarden = garden.some(g => g.id === item.id);
                  return (
                    <TouchableOpacity
                      style={styles.modalPlantItem}
                      onPress={() => handleAddToGarden(item.id)}
                      disabled={isInGarden}
                    >
                      <Image source={{ uri: item.imageUri }} style={styles.modalPlantImage} />
                      <View style={styles.modalPlantInfo}>
                        <Text style={styles.modalPlantName}>{item.commonName}</Text>
                        <Text style={styles.modalPlantScientific}>{item.scientificName}</Text>
                      </View>
                      {isInGarden ? (
                        <View style={styles.inGardenBadge}>
                          <Text style={styles.inGardenText}>In Garden</Text>
                        </View>
                      ) : (
                        <Plus size={24} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showHistoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.historyModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Watering History</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <X size={24} color={Colors.black} />
              </TouchableOpacity>
            </View>

            {selectedPlant && (
              <>
                <View style={styles.historyPlantInfo}>
                  <Text style={styles.historyPlantName}>{selectedPlant.commonName}</Text>
                  <Text style={styles.historyPlantScientific}>{selectedPlant.scientificName}</Text>
                </View>

                <ScrollView style={styles.historyList}>
                  {selectedPlant.wateringHistory && selectedPlant.wateringHistory.length > 0 ? (
                    selectedPlant.wateringHistory.map((record: any, index: number) => (
                      <View key={index} style={styles.historyItem}>
                        <View style={styles.historyIconContainer}>
                          <Droplets size={20} color={Colors.primary} />
                        </View>
                        <View style={styles.historyItemContent}>
                          <Text style={styles.historyDate}>
                            {new Date(record.timestamp).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </Text>
                          <Text style={styles.historyTime}>
                            {new Date(record.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.historyEmpty}>
                      <Droplets size={48} color={Colors.gray.medium} />
                      <Text style={styles.historyEmptyText}>No watering history yet</Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray.dark,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  healthCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    backgroundColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  healthTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 8,
  },
  healthText: {
    fontSize: 14,
    color: Colors.gray.dark,
    marginBottom: 16,
    lineHeight: 20,
  },
  diagnoseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  diagnoseButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  plantsContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  plantCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  plantImage: {
    width: 120,
    height: '100%',
  },
  plantContent: {
    flex: 1,
    padding: 16,
  },
  plantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  plantTitleContainer: {
    flex: 1,
  },
  plantName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  plantScientific: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.gray.dark,
  },
  healthDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  careInfo: {
    marginBottom: 12,
  },
  careItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  careText: {
    fontSize: 14,
    color: Colors.gray.dark,
  },
  careTextWarning: {
    color: Colors.error,
    fontWeight: '600' as const,
  },
  lastWatered: {
    fontSize: 12,
    color: Colors.gray.medium,
    marginTop: 4,
  },
  waterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  waterButtonUrgent: {
    backgroundColor: Colors.error,
  },
  waterButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  historyButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyModalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    height: '80%',
  },
  historyPlantInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray.light,
    alignItems: 'center',
  },
  historyPlantName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  historyPlantScientific: {
    fontSize: 16,
    fontStyle: 'italic',
    color: Colors.gray.dark,
  },
  historyList: {
    flex: 1,
    padding: 20,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.gray.light,
  },
  historyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyItemContent: {
    flex: 1,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 13,
    color: Colors.gray.dark,
  },
  historyEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  historyEmptyText: {
    fontSize: 16,
    color: Colors.gray.dark,
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.black,
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.gray.dark,
    textAlign: 'center',
    marginBottom: 24,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.black,
  },
  modalEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 16,
    color: Colors.gray.dark,
    marginTop: 16,
    marginBottom: 24,
  },
  modalScanButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalScanButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  modalPlantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray.light,
  },
  modalPlantImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  modalPlantInfo: {
    flex: 1,
  },
  modalPlantName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  modalPlantScientific: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.gray.dark,
  },
  inGardenBadge: {
    backgroundColor: Colors.gray.light,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  inGardenText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.gray.dark,
  },
});
