import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { createUser, findUserByEmail } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export const signUpProcedure = publicProcedure
  .input(
    z.object({
      email: z.string().trim().toLowerCase().email('Invalid email address'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      fullName: z.string().trim().min(1, 'Full name is required'),
    })
  )
  .mutation(async ({ input }) => {
    try {
      console.log('[SignUp] Attempt for email:', input.email);
      const { email, password, fullName } = input;

      console.log('[SignUp] Checking for existing user...');
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        console.log('[SignUp] User already exists');
        throw new Error('User already exists with this email. Please use a different email or try logging in.');
      }

      console.log('[SignUp] Hashing password...');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      console.log('[SignUp] Creating user in database...');
      const mongoUser = await createUser(email, hashedPassword, fullName);
      
      console.log('[SignUp] User created successfully:', mongoUser._id?.toString());

      return {
        id: mongoUser._id!.toString(),
        email: mongoUser.email,
        fullName: mongoUser.fullName,
      };
    } catch (error) {
      console.error('[SignUp] Error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
      });
      throw error;
    }
  });
