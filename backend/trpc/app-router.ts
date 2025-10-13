import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { sendEmailProcedure } from "./routes/contact/send-email/route";
import { signUpProcedure } from "./routes/auth/signup/route";
import { signInProcedure } from "./routes/auth/signin/route";
import { getUserProcedure } from "./routes/auth/get-user/route";
import { updateUserProcedure } from "./routes/auth/update-user/route";
import { deleteUserProcedure } from "./routes/auth/delete-user/route";
import { getUserSubscriptionProcedure } from "./routes/subscription/get-subscription/route";
import { getDailyScansRemainingProcedure } from "./routes/scans/get-daily-scans/route";
import { incrementDailyScanProcedure } from "./routes/scans/increment-scan/route";
import { healthCheckProcedure } from "./routes/health/check/route";
import { identifyPlantProcedure } from "./routes/plant/identify/route";

export const appRouter = createTRPCRouter({
  health: createTRPCRouter({
    check: healthCheckProcedure,
  }),
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  contact: createTRPCRouter({
    sendEmail: sendEmailProcedure,
  }),
  auth: createTRPCRouter({
    signUp: signUpProcedure,
    signIn: signInProcedure,
    getUser: getUserProcedure,
    updateUser: updateUserProcedure,
    deleteUser: deleteUserProcedure,
  }),
  subscription: createTRPCRouter({
    getSubscription: getUserSubscriptionProcedure,
  }),
  scans: createTRPCRouter({
    getDailyScans: getDailyScansRemainingProcedure,
    incrementScan: incrementDailyScanProcedure,
  }),
  plant: createTRPCRouter({
    identify: identifyPlantProcedure,
  }),
});

export type AppRouter = typeof appRouter;
