import { handlers, LevelName, Logger } from "std/log/mod.ts";

const formatter = "[{loggerName}] {levelName} {msg}";

export function createLogger(name: string, level: LevelName) {
  return new Logger(name, level, {
    handlers: [
      new handlers.ConsoleHandler(level, {
        formatter,
      }),
    ],
  });
}
