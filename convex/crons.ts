import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Restarts large-document ingestion chains whose next step was lost (an
// action killed before it could schedule its successor) — see
// resumeStalled in largeDocuments.ts.
crons.interval("resume stalled large-document ingestion", { minutes: 2 }, internal.largeDocuments.resumeStalled, {});

export default crons;
