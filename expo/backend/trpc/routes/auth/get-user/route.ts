import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { findUserById } from '@/lib/mongodb';

export const getUserProcedure = publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input }) => {
    const mongoUser = await findUserById(input.userId);
    if (!mongoUser) {
      return null;
    }

    return {
      id: mongoUser._id!.toString(),
      email: mongoUser.email,
      fullName: mongoUser.fullName,
    };
  });
