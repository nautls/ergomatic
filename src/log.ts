import { handlers, LevelName, Logger, LogRecord } from "std/log/mod.ts";
import { format } from "std/datetime/mod.ts";

function formatter({ loggerName, levelName, msg }: LogRecord) {
  const datetime = format(new Date(), "yyyy-MM-dd HH:mm:ss");

  return `[${datetime}][${loggerName}][${levelName}] ${msg}`;
}

export function createLogger(name: string, level: LevelName) {
  return new Logger(name, level, {
    handlers: [
      new handlers.ConsoleHandler(level, {
        formatter,
      }),
    ],
  });
}
