import { publicProcedure } from '../../../create-context';
import { connectToDatabase } from '@/lib/mongodb';

export const healthCheckProcedure = publicProcedure.query(async () => {
  try {
    console.log('[HealthCheck] Testing MongoDB connection...');
    const { client } = await connectToDatabase();
    await client.db().admin().ping();
    console.log('[HealthCheck] MongoDB connection successful');
    
    return {
      status: 'ok',
      mongodb: 'connected',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[HealthCheck] MongoDB connection failed:', error);
    return {
      status: 'error',
      mongodb: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
});
