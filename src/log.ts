import { handlers, LevelName, Logger, LogRecord } from "std/log/mod.ts";
import { format } from "std/datetime/mod.ts";
import { join } from "std/path/mod.ts";
import dirs from "dirs/mod.ts";
import { isTesting } from "./_utils.ts";
import { ErgomaticError } from "./error.ts";

function formatter({ loggerName, levelName, msg }: LogRecord) {
  const datetime = format(new Date(), "yyyy-MM-dd HH:mm:ss");

  return `[${datetime}][${loggerName}][${levelName}] ${msg}`;
}

function logsDir() {
  const dataDir = dirs("data_local");

  if (!dataDir) {
    throw new ErgomaticError("Failed to find data directory");
  }

  return join(dataDir, "ergomatic");
}

export function createLogger(name: string, level: LevelName) {
  const logHandlers = [];

  if (!isTesting()) {
    const fileHandler = new handlers.FileHandler(level, {
      formatter,
      filename: join(logsDir(), "ergomatic.log"),
    });

    fileHandler.setup();

    logHandlers.push(
      new handlers.ConsoleHandler(level, {
        formatter,
      }),
      fileHandler,
    );
  }

  return new Logger(name, level, {
    handlers: logHandlers,
  });
}
