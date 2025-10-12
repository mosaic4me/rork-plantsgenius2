import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { getDailyScans } from '@/lib/mongodb';

export const getDailyScansRemainingProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string(),
      date: z.string(),
    })
  )
  .query(async ({ input }) => {
    const dailyScan = await getDailyScans(input.userId, input.date);
    const scanCount = dailyScan?.scanCount || 0;
    return {
      scansRemaining: Math.max(0, 2 - scanCount),
      scanCount,
    };
  });
