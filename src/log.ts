import {
  HandlerOptions,
  handlers,
  LevelName,
  Logger,
  LogMode,
  LogRecord,
} from "std/log/mod.ts";
import { format } from "std/datetime/mod.ts";
import { join } from "std/path/mod.ts";
import dirs from "dirs/mod.ts";
import { isTesting, mbToBytes } from "./_utils.ts";
import { ErgomaticError } from "./error.ts";
import { existsSync } from "std/fs/exists.ts";
import { BufWriterSync } from "std/io/buf_writer.ts";

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

interface RotatingFileHandlerOptions extends HandlerOptions {
  filename: string;
  mode?: LogMode;
  maxBytes: number;
  maxBackupCount: number;
}

/**
 * `RotatingFileHandler` provided by deno has async `setup()` method
 * which appears to be a bug: https://github.com/denoland/deno_std/issues/3538#issuecomment-1676942783
 * If this is addressed in deno maybe one day we can remove this class.
 *
 * Create a sync version of `RotatingFileHandler` and use that instead.
 * This is basically just `RotatingFileHandler` but using `Deno.*Sync` methods instead.
 */
class SyncRotatingFileHandler extends handlers.FileHandler {
  #maxBytes: number;
  #maxBackupCount: number;
  #currentFileSize = 0;

  constructor(levelName: LevelName, options: RotatingFileHandlerOptions) {
    super(levelName, options);
    this.#maxBytes = options.maxBytes;
    this.#maxBackupCount = options.maxBackupCount;
  }

  override setup() {
    if (this.#maxBytes < 1) {
      this.destroy();
      throw new Error("maxBytes cannot be less than 1");
    }
    if (this.#maxBackupCount < 1) {
      this.destroy();
      throw new Error("maxBackupCount cannot be less than 1");
    }
    super.setup();

    if (this._mode === "w") {
      // Remove old backups too as it doesn't make sense to start with a clean
      // log file, but old backups
      for (let i = 1; i <= this.#maxBackupCount; i++) {
        try {
          Deno.removeSync(this._filename + "." + i);
        } catch (error) {
          if (!(error instanceof Deno.errors.NotFound)) {
            throw error;
          }
        }
      }
    } else if (this._mode === "x") {
      // Throw if any backups also exist
      for (let i = 1; i <= this.#maxBackupCount; i++) {
        if (existsSync(this._filename + "." + i)) {
          this.destroy();
          throw new Deno.errors.AlreadyExists(
            "Backup log file " + this._filename + "." + i + " already exists",
          );
        }
      }
    } else {
      this.#currentFileSize = Deno.statSync(this._filename).size;
    }
  }

  override log(msg: string) {
    const msgByteLength = this._encoder.encode(msg).byteLength + 1;

    if (this.#currentFileSize + msgByteLength > this.#maxBytes) {
      this.rotateLogFiles();
      this.#currentFileSize = 0;
    }

    super.log(msg);

    this.#currentFileSize += msgByteLength;
  }

  rotateLogFiles() {
    this._buf.flush();
    this._file!.close();

    for (let i = this.#maxBackupCount - 1; i >= 0; i--) {
      const source = this._filename + (i === 0 ? "" : "." + i);
      const dest = this._filename + "." + (i + 1);

      if (existsSync(source)) {
        Deno.renameSync(source, dest);
      }
    }

    this._file = Deno.openSync(this._filename, this._openOptions);
    this._writer = this._file;
    this._buf = new BufWriterSync(this._file);
  }
}

export function createLogger(name: string, level: LevelName) {
  const logHandlers = [];

  if (!isTesting()) {
    const fileHandler = new SyncRotatingFileHandler(level, {
      formatter,
      filename: join(logsDir(), "ergomatic.log"),
      maxBackupCount: 3,
      maxBytes: mbToBytes(100),
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
