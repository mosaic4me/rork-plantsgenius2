import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CurrencyRates {
  [key: string]: number;
}

interface ConversionResult {
  amount: number;
  currency: string;
  symbol: string;
}

const CURRENCY_SYMBOLS: { [key: string]: string } = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  NGN: '₦',
  GHS: '₵',
  ZAR: 'R',
  KES: 'KSh',
  EGP: 'E£',
};

const WEST_AFRICAN_COUNTRIES = ['NG', 'GH', 'SN', 'CI', 'BJ', 'TG', 'ML', 'BF', 'NE', 'GM', 'SL', 'LR', 'GN', 'GW', 'CV'];

let cachedRates: CurrencyRates | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 3600000;

export async function getUserLocation(): Promise<{ country: string; currency: string } | null> {
  try {
    const cachedLocation = await AsyncStorage.getItem('userLocation');
    if (cachedLocation) {
      return JSON.parse(cachedLocation);
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[Location] Permission denied, using USD as default');
      return { country: 'US', currency: 'USD' };
    }

    const location = await Location.getCurrentPositionAsync({});
    const [geocode] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    const countryCode = geocode?.isoCountryCode || 'US';
    const currency = getCountryCurrency(countryCode);

    const locationData = { country: countryCode, currency };
    await AsyncStorage.setItem('userLocation', JSON.stringify(locationData));

    console.log('[Location] Detected:', locationData);
    return locationData;
  } catch (error) {
    console.error('[Location] Error getting location:', error);
    return { country: 'US', currency: 'USD' };
  }
}

function getCountryCurrency(countryCode: string): string {
  const currencyMap: { [key: string]: string } = {
    US: 'USD',
    GB: 'GBP',
    NG: 'NGN',
    GH: 'GHS',
    ZA: 'ZAR',
    KE: 'KES',
    EG: 'EGP',
  };

  return currencyMap[countryCode] || 'USD';
}

export function isWestAfricanCountry(countryCode: string): boolean {
  return WEST_AFRICAN_COUNTRIES.includes(countryCode);
}

async function fetchCurrencyRates(): Promise<CurrencyRates> {
  const now = Date.now();
  if (cachedRates && now - lastFetchTime < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    const apiKey = process.env.EXPO_PUBLIC_CURRENCY_API_KEY;
    const apiUrl = process.env.EXPO_PUBLIC_CURRENCY_API_URL;
    
    if (!apiKey || !apiUrl) {
      throw new Error('Currency API configuration missing');
    }

    const response = await fetch(`${apiUrl}?apikey=${apiKey}&base_currency=USD`);
    const data = await response.json();

    if (!data.data) {
      throw new Error('Invalid API response');
    }

    cachedRates = data.data;
    lastFetchTime = now;
    
    console.log('[Currency] Rates fetched successfully');
    return cachedRates as CurrencyRates;
  } catch (error) {
    console.error('[Currency] Error fetching rates:', error);
    
    return {
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      NGN: 1650,
      GHS: 15.5,
      ZAR: 18.5,
      KES: 129,
      EGP: 49,
    };
  }
}

export async function convertCurrency(
  amount: number,
  targetCurrency?: string
): Promise<ConversionResult> {
  try {
    let currency = targetCurrency;
    
    if (!currency) {
      const location = await getUserLocation();
      currency = location?.currency || 'USD';
    }

    if (currency === 'USD') {
      return {
        amount,
        currency: 'USD',
        symbol: CURRENCY_SYMBOLS.USD,
      };
    }

    const rates = await fetchCurrencyRates();
    const rate = rates[currency];

    if (!rate) {
      console.warn(`[Currency] No rate found for ${currency}, using USD`);
      return {
        amount,
        currency: 'USD',
        symbol: CURRENCY_SYMBOLS.USD,
      };
    }

    let convertedAmount = amount * rate;
    convertedAmount = Math.round(convertedAmount / 100) * 100;

    console.log(`[Currency] Converted $${amount} USD to ${convertedAmount} ${currency}`);

    return {
      amount: convertedAmount,
      currency,
      symbol: CURRENCY_SYMBOLS[currency] || currency,
    };
  } catch (error) {
    console.error('[Currency] Conversion error:', error);
    return {
      amount,
      currency: 'USD',
      symbol: CURRENCY_SYMBOLS.USD,
    };
  }
}

export function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  
  if (currency === 'USD' || currency === 'GBP' || currency === 'EUR') {
    return `${symbol}${amount.toFixed(2)}`;
  }
  
  return `${symbol}${amount.toLocaleString()}`;
}
