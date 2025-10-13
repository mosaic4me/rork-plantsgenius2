import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PlantIdentification, GardenPlant, WateringRecord } from '@/types/plant';

const HISTORY_KEY = '@plantgenius_history';
const GARDEN_KEY = '@plantgenius_garden';
const STATS_KEY = '@plantgenius_stats';

interface AppStats {
  totalScans: number;
  plantsInGarden: number;
}

export const [AppProvider, useApp] = createContextHook(() => {
  const [history, setHistory] = useState<PlantIdentification[]>([]);
  const [garden, setGarden] = useState<GardenPlant[]>([]);
  const [stats, setStats] = useState<AppStats>({ totalScans: 0, plantsInGarden: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [historyData, gardenData, statsData] = await Promise.all([
        AsyncStorage.getItem(HISTORY_KEY),
        AsyncStorage.getItem(GARDEN_KEY),
        AsyncStorage.getItem(STATS_KEY),
      ]);

      if (historyData) setHistory(JSON.parse(historyData));
      if (gardenData) setGarden(JSON.parse(gardenData));
      if (statsData) setStats(JSON.parse(statsData));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addToHistory = useCallback(async (plant: PlantIdentification) => {
    try {
      setHistory((prevHistory) => {
        const newHistory = [plant, ...prevHistory].slice(0, 50);
        AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
        return newHistory;
      });

      setStats((prevStats) => {
        const newStats = { ...prevStats, totalScans: prevStats.totalScans + 1 };
        AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats));
        return newStats;
      });
    } catch (error) {
      console.error('Error adding to history:', error);
    }
  }, []);

  const removeFromHistory = useCallback(async (id: string) => {
    try {
      setHistory((prevHistory) => {
        const newHistory = prevHistory.filter((item) => item.id !== id);
        AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
        return newHistory;
      });
    } catch (error) {
      console.error('Error removing from history:', error);
    }
  }, []);

  const toggleSaved = useCallback(async (id: string) => {
    try {
      setHistory((prevHistory) => {
        const newHistory = prevHistory.map((item) =>
          item.id === id ? { ...item, saved: !item.saved } : item
        );
        AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
        return newHistory;
      });
    } catch (error) {
      console.error('Error toggling saved:', error);
    }
  }, []);

  const addToGarden = useCallback(async (plant: PlantIdentification) => {
    try {
      const gardenPlant: GardenPlant = {
        ...plant,
        addedToGarden: Date.now(),
        healthStatus: 'healthy',
      };
      setGarden((prevGarden) => {
        const newGarden = [...prevGarden, gardenPlant];
        AsyncStorage.setItem(GARDEN_KEY, JSON.stringify(newGarden));
        
        setStats((prevStats) => {
          const newStats = { ...prevStats, plantsInGarden: newGarden.length };
          AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats));
          return newStats;
        });
        
        return newGarden;
      });
    } catch (error) {
      console.error('Error adding to garden:', error);
    }
  }, []);

  const removeFromGarden = useCallback(async (id: string) => {
    try {
      setGarden((prevGarden) => {
        const newGarden = prevGarden.filter((item) => item.id !== id);
        AsyncStorage.setItem(GARDEN_KEY, JSON.stringify(newGarden));
        
        setStats((prevStats) => {
          const newStats = { ...prevStats, plantsInGarden: newGarden.length };
          AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats));
          return newStats;
        });
        
        return newGarden;
      });
    } catch (error) {
      console.error('Error removing from garden:', error);
    }
  }, []);

  const scheduleWateringNotification = useCallback(async (plant: GardenPlant, nextWateringDue: number) => {
    if (Platform.OS === 'web') return;

    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') return;
      }

      const secondsUntilWatering = Math.floor((nextWateringDue - Date.now()) / 1000);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 Time to Water Your Plant!',
          body: `${plant.commonName} needs watering. Don't forget to care for your plant!`,
          data: { plantId: plant.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntilWatering,
          repeats: false,
        } as Notifications.TimeIntervalTriggerInput,
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }, []);

  const updatePlantWatering = useCallback(async (id: string) => {
    try {
      const now = Date.now();
      const nextWateringDue = now + 7 * 24 * 60 * 60 * 1000;
      
      setGarden((prevGarden) => {
        const newGarden = prevGarden.map((item) => {
          if (item.id === id) {
            const wateringRecord: WateringRecord = {
              timestamp: now,
              plantId: item.id,
              plantName: item.commonName,
            };
            
            const updatedPlant = {
              ...item,
              lastWatered: now,
              nextWateringDue,
              wateringHistory: [...(item.wateringHistory || []), wateringRecord],
            };
            
            scheduleWateringNotification(updatedPlant, nextWateringDue);
            
            return updatedPlant;
          }
          return item;
        });
        AsyncStorage.setItem(GARDEN_KEY, JSON.stringify(newGarden));
        return newGarden;
      });
    } catch (error) {
      console.error('Error updating watering:', error);
    }
  }, [scheduleWateringNotification]);

  return useMemo(() => ({
    history,
    garden,
    stats,
    isLoading,
    addToHistory,
    removeFromHistory,
    toggleSaved,
    addToGarden,
    removeFromGarden,
    updatePlantWatering,
  }), [history, garden, stats, isLoading, addToHistory, removeFromHistory, toggleSaved, addToGarden, removeFromGarden, updatePlantWatering]);
});
