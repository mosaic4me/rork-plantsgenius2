import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { incrementDailyScans } from '@/lib/mongodb';

export const incrementDailyScanProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string(),
      date: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    await incrementDailyScans(input.userId, input.date);
    return { success: true };
  });
