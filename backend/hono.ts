import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

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
      health: "/api/trpc/health.check",
      auth: "/api/trpc/auth.*",
      scans: "/api/trpc/scans.*"
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
