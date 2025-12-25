/**
 * Development-only logger utility.
 * Wraps console methods to only output in development mode.
 */

// Handle different environment checks (Vite vs Node)
const isDev = 
  (typeof import.meta !== 'undefined' && import.meta.env?.DEV) || 
  process.env.NODE_ENV === 'development';

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
  
  /** Error message - ALWAYS shows in production (important for debugging prod issues) */
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  
  /** Debug message - dev only */
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
  
  /** Group logs - dev only */
  group: (label: string) => {
    if (isDev) console.group(label);
  },
  
  groupEnd: () => {
    if (isDev) console.groupEnd();
  },
};

export default logger;
