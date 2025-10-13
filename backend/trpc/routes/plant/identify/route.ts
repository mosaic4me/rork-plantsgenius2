import { z } from "zod";
import { publicProcedure } from "../../create-context";

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
      
      const blob = new Blob([buffer], { type: input.mimeType });
      
      const formData = new FormData();
      formData.append('images', blob, 'plant.jpg');
      formData.append('organs', 'auto');

      const url = `${PLANTNET_API_URL}?api-key=${PLANTNET_API_KEY}`;
      console.log('[Backend] Sending request to Pl@ntNet API');
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      console.log('[Backend] API Response status:', response.status);
      
      if (!response.ok) {
        let errorText = '';
        try {
          const errorJson = await response.json();
          errorText = JSON.stringify(errorJson);
          console.error('[Backend] API Error (JSON):', errorJson);
        } catch {
          errorText = await response.text();
          console.error('[Backend] API Error (Text):', errorText);
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
      throw new Error(error.message || 'Failed to identify plant');
    }
  });
