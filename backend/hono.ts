import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { findUserByEmail, createUser } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
    const body = await c.req.json();
    const { email, password, fullName } = body;

    if (!email || !password || !fullName) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    console.log('[REST SignUp] Checking for existing user:', email);
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      console.log('[REST SignUp] User already exists');
      return c.json({ error: 'User already exists with this email' }, 400);
    }

    console.log('[REST SignUp] Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('[REST SignUp] Creating user in database...');
    const mongoUser = await createUser(email, hashedPassword, fullName);
    
    const token = jwt.sign(
      { userId: mongoUser._id!.toString(), email: mongoUser.email },
      process.env.JWT_SECRET || '2a804b2aea4c1f663e7e82e532abe6cb43c9d8d467bb83e11af5be7c665f342d',
      { expiresIn: '30d' }
    );

    console.log('[REST SignUp] User created successfully');
    return c.json({
      user: {
        id: mongoUser._id!.toString(),
        email: mongoUser.email,
        fullName: mongoUser.fullName,
      },
      token,
    });
  } catch (error: any) {
    console.error('[REST SignUp] Error:', error.message);
    return c.json({ error: error.message || 'Failed to create user' }, 500);
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

    const token = jwt.sign(
      { userId: user._id!.toString(), email: user.email },
      process.env.JWT_SECRET || '2a804b2aea4c1f663e7e82e532abe6cb43c9d8d467bb83e11af5be7c665f342d',
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
