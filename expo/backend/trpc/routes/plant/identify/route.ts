import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";

const PLANTNET_API_KEY = '2b100he5fPRI5nc3c0vQShFT1u';
const PLANTNET_API_URL = 'https://my-api.plantnet.org/v2/identify/all';

export const identifyPlantProcedure = publicProcedure
  .input(
    z.object({
      imageBase64: z.string(),
      mimeType: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      console.log('[Backend] Starting plant identification');
      
      const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const formData = new FormData();
      const blob = new Blob([buffer], { type: input.mimeType });
      formData.append('images', blob, 'plant.jpg');
      formData.append('organs', 'auto');

      const url = `${PLANTNET_API_URL}?api-key=${PLANTNET_API_KEY}`;
      console.log('[Backend] Sending request to Pl@ntNet API');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      
      console.log('[Backend] Making fetch request to PlantNet API');
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      console.log('[Backend] Fetch completed successfully');

      console.log('[Backend] API Response status:', response.status);
      
      if (!response.ok) {
        let errorText = '';
        let errorJson: any = null;
        
        try {
          errorJson = await response.json();
          errorText = JSON.stringify(errorJson);
          console.error('[Backend] API Error (JSON):', errorJson);
        } catch {
          errorText = await response.text();
          console.error('[Backend] API Error (Text):', errorText);
        }
        
        if (response.status === 429) {
          throw new Error('RATE_LIMIT_EXCEEDED');
        }
        
        if (response.status === 401) {
          throw new Error('API authentication failed. Please check the API key.');
        }
        
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[Backend] Plant identification successful');
      
      return data;
    } catch (error: any) {
      console.error('[Backend] Error identifying plant:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('Plant identification timed out. The service is taking too long to respond. Please try again.');
      }
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
        throw new Error('Unable to connect to PlantNet service from backend. Network error occurred.');
      }
      
      throw new Error(error.message || 'Failed to identify plant');
    }
  });
