import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { updateUser } from '@/lib/mongodb';

export const updateUserProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string(),
      fullName: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { userId, ...updates } = input;
    await updateUser(userId, updates);
    return { success: true };
  });
