// Extra checks on Wednesdays, when Hello Games posts (about 14:00 UTC).
// Every 10 minutes from 13:00 to 19:59 UTC; the normal 3-hourly watcher still runs all week.
import watch from "./expedition-watch.mjs";
export default watch;
export const config = { schedule: "*/10 13-19 * * 3" };
