import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { findUserByEmail, createUser } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validator from 'validator';

const app = new Hono();

app.use("*", cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.get("/", (c) => {
  console.log('[Backend] Root endpoint hit');
  return c.json({ 
    status: "ok", 
    message: "PlantGenius Backend API is running", 
    version: "1.0.0",
    endpoints: {
      health: "/health",
      auth: ["/api/auth/signup", "/api/auth/signin"],
      trpc: "/api/trpc/*"
    },
    timestamp: new Date().toISOString() 
  });
});

app.get("/health", (c) => {
  console.log('[Backend] Health check endpoint hit');
  return c.json({ 
    status: "ok", 
    message: "Backend is healthy",
    timestamp: new Date().toISOString() 
  });
});

app.get("/api/health", (c) => {
  console.log('[Backend] API Health check endpoint hit');
  return c.json({ 
    status: "ok", 
    message: "Backend API is healthy",
    timestamp: new Date().toISOString() 
  });
});

app.post("/api/auth/signup", async (c) => {
  try {
    console.log('[REST SignUp] Request received');
    console.log('[REST SignUp] Content-Type:', c.req.header('content-type'));
    
    let body;
    try {
      body = await c.req.json();
      console.log('[REST SignUp] Body parsed successfully');
    } catch (parseError) {
      console.error('[REST SignUp] Failed to parse JSON body:', parseError);
      return c.json({ error: 'Invalid JSON in request body' }, 400);
    }
    
    const { email, password, fullName } = body;

    console.log('[REST SignUp] Validating input...');
    if (!email || !password || !fullName) {
      console.log('[REST SignUp] Missing required fields');
      return c.json({ error: 'Missing required fields: email, password, and fullName are required' }, 400);
    }

    if (typeof email !== 'string' || typeof password !== 'string' || typeof fullName !== 'string') {
      console.log('[REST SignUp] Invalid field types');
      return c.json({ error: 'Invalid field types: email, password, and fullName must be strings' }, 400);
    }

    const trimmedEmail = email.trim().toLowerCase();
    const sanitizedName = validator.escape(fullName.trim());

    if (!validator.isEmail(trimmedEmail)) {
      console.log('[REST SignUp] Invalid email format');
      return c.json({ error: 'Invalid email format' }, 400);
    }

    if (password.length < 8) {
      console.log('[REST SignUp] Password too short');
      return c.json({ error: 'Password must be at least 8 characters with uppercase letter and number' }, 400);
    }

    if (!/[A-Z]/.test(password)) {
      console.log('[REST SignUp] Password missing uppercase');
      return c.json({ error: 'Password must contain at least one uppercase letter' }, 400);
    }

    if (!/[0-9]/.test(password)) {
      console.log('[REST SignUp] Password missing number');
      return c.json({ error: 'Password must contain at least one number' }, 400);
    }

    console.log('[REST SignUp] Checking for existing user:', trimmedEmail);
    const existingUser = await findUserByEmail(trimmedEmail);
    if (existingUser) {
      console.log('[REST SignUp] User already exists');
      return c.json({ error: 'User already exists with this email' }, 400);
    }

    console.log('[REST SignUp] Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('[REST SignUp] Creating user in database...');
    const mongoUser = await createUser(trimmedEmail, hashedPassword, sanitizedName);
    
    if (!process.env.JWT_SECRET) {
      console.error('[REST SignUp] CRITICAL: JWT_SECRET not configured');
      return c.json({ error: 'Server configuration error' }, 500);
    }

    console.log('[REST SignUp] Generating JWT token...');
    const token = jwt.sign(
      { userId: mongoUser._id!.toString(), email: mongoUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log('[REST SignUp] User created successfully:', mongoUser._id!.toString());
    return c.json({
      user: {
        id: mongoUser._id!.toString(),
        email: mongoUser.email,
        fullName: mongoUser.fullName,
      },
      token,
    }, 201);
  } catch (error: any) {
    console.error('[REST SignUp] Error occurred:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.substring(0, 500),
    });
    
    let errorMessage = 'Failed to create user';
    
    if (error?.message) {
      if (error.message.includes('already exists')) {
        errorMessage = 'User already exists with this email';
        return c.json({ error: errorMessage }, 400);
      } else if (error.message.includes('MongoDB') || error.message.includes('database')) {
        errorMessage = 'Database connection error. Please try again later.';
        return c.json({ error: errorMessage }, 503);
      } else if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Service temporarily unavailable. Please try again later.';
        return c.json({ error: errorMessage }, 503);
      } else {
        errorMessage = error.message;
      }
    }
    
    return c.json({ error: errorMessage }, 500);
  }
});

app.post("/api/auth/signin", async (c) => {
  try {
    console.log('[REST SignIn] Request received');
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    console.log('[REST SignIn] Finding user:', email);
    const user = await findUserByEmail(email);
    if (!user) {
      console.log('[REST SignIn] User not found');
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    console.log('[REST SignIn] Verifying password...');
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.log('[REST SignIn] Invalid password');
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    if (!process.env.JWT_SECRET) {
      console.error('[REST SignIn] CRITICAL: JWT_SECRET not configured');
      return c.json({ error: 'Server configuration error' }, 500);
    }

    const token = jwt.sign(
      { userId: user._id!.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log('[REST SignIn] Sign in successful');
    return c.json({
      user: {
        id: user._id!.toString(),
        email: user.email,
        fullName: user.fullName,
      },
      token,
    });
  } catch (error: any) {
    console.error('[REST SignIn] Error:', error.message);
    return c.json({ error: error.message || 'Failed to sign in' }, 500);
  }
});

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    onError: ({ error, path }) => {
      console.error('[tRPC] Error on path:', path);
      console.error('[tRPC] Error details:', {
        message: error.message,
        code: error.code,
        cause: error.cause,
      });
    },
  })
);

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    onError: ({ error, path }) => {
      console.error('[tRPC] Error on path:', path);
      console.error('[tRPC] Error details:', {
        message: error.message,
        code: error.code,
        cause: error.cause,
      });
    },
  })
);

export default app;
