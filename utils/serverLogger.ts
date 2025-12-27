/**
 * Server-side logger utility for Vercel serverless functions.
 * Uses only Node.js compatible environment detection.
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  /** Log message - dev only */
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  
  /** Info message - dev only */
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  
  /** Warning message - dev only */
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  
  /** Error message - ALWAYS shows in production */
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  
  /** Debug message - dev only */
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
};

export default logger;
