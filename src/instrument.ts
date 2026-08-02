import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,

  integrations: [
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
  ],

  tracesSampleRate: 0.2,
  tracePropagationTargets: ["localhost", ...(supabaseUrl ? [supabaseUrl] : [])],

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,
  beforeSendLog: (log) => {
    // Drop verbose levels; only trace/debug should ever emit these in local dev.
    if (log.level === "trace" || log.level === "debug") return null;
    return log;
  },
});
