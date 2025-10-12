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
    message: "Backend API is running", 
    endpoints: {
      health: "/api/trpc/health.check",
      auth: "/api/trpc/auth.*",
      scans: "/api/trpc/scans.*"
    },
    timestamp: new Date().toISOString() 
  });
});

app.get("/api", (c) => {
  console.log('[Backend] /api endpoint hit');
  return c.json({ status: "ok", message: "API endpoint is running", timestamp: new Date().toISOString() });
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

export default app;
