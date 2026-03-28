import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { findUserByEmail } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export const signInProcedure = publicProcedure
  .input(
    z.object({
      email: z.string().trim().toLowerCase().email('Invalid email address'),
      password: z.string().min(1, 'Password is required'),
    })
  )
  .mutation(async ({ input }) => {
    const { email, password } = input;

    const mongoUser = await findUserByEmail(email);
    if (!mongoUser) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, mongoUser.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    return {
      id: mongoUser._id!.toString(),
      email: mongoUser.email,
      fullName: mongoUser.fullName,
    };
  });
