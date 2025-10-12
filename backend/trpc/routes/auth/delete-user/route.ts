import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { softDeleteUser } from '@/lib/mongodb';

export const deleteUserProcedure = publicProcedure
  .input(z.object({ userId: z.string() }))
  .mutation(async ({ input }) => {
    await softDeleteUser(input.userId);
    return { success: true };
  });
