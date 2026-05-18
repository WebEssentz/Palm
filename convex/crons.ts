import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
    "hard delete expired trash projects",
    { hourUTC: 3, minuteUTC: 0 }, // runs at 3am UTC every day
    internal.projects.hardDeleteExpiredProjects,
);

export default crons;
