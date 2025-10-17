import { protectedProcedure } from '../../../create-context';
import { z } from 'zod';
import { createSubscription } from '@/lib/mongodb';

export const createSubscriptionProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.string(),
      planType: z.enum(['basic', 'premium']),
      billingCycle: z.enum(['monthly', 'yearly']),
      status: z.enum(['active', 'cancelled', 'expired']),
      startDate: z.string(),
      endDate: z.string(),
      paymentReference: z.string(),
      amount: z.number().optional(),
      currency: z.string().optional(),
      paymentMethod: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('[CreateSubscription] Processing subscription for user:', input.userId);
    
    if (ctx.user?.userId !== input.userId) {
      console.error('[CreateSubscription] User ID mismatch');
      throw new Error('Unauthorized: User ID mismatch');
    }

    const subscription = await createSubscription({
      userId: input.userId,
      planType: input.planType,
      status: input.status,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      paymentReference: input.paymentReference,
    });

    console.log('[CreateSubscription] Subscription created:', subscription._id?.toString());

    return {
      id: subscription._id!.toString(),
      planType: subscription.planType,
      status: subscription.status,
      startDate: subscription.startDate.toISOString(),
      endDate: subscription.endDate.toISOString(),
    };
  });
