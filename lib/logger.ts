/* eslint-disable no-console */

type LogArguments = unknown[];

const shouldLogDebug = () => process.env.NODE_ENV !== 'production';

export const logger = {
  info: (...args: LogArguments) => {
    if (shouldLogDebug()) {
      console.info(...args);
    }
  },
  warn: (...args: LogArguments) => {
    if (shouldLogDebug()) {
      console.warn(...args);
    }
  },
  error: (...args: LogArguments) => {
    console.error(...args);
  },
  debug: (...args: LogArguments) => {
    if (shouldLogDebug()) {
      console.debug(...args);
    }
  },
};

export type Logger = typeof logger;
