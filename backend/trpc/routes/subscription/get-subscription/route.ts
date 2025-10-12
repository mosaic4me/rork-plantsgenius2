import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { getUserSubscription } from '@/lib/mongodb';

export const getUserSubscriptionProcedure = publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input }) => {
    const mongoSub = await getUserSubscription(input.userId);
    if (!mongoSub) {
      return null;
    }

    return {
      id: mongoSub._id!.toString(),
      planType: mongoSub.planType,
      status: mongoSub.status,
      startDate: mongoSub.startDate.toISOString(),
      endDate: mongoSub.endDate.toISOString(),
    };
  });
