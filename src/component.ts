import { Logger } from "std/log/mod.ts";
import { ErgomaticConfig } from "./config.ts";
import { createLogger } from "./log.ts";
import { EventEmitter } from "./event_emitter.ts";

// deno-lint-ignore no-explicit-any
type ComponentEvent = Record<string, any>;

export abstract class Component<
  T extends ComponentEvent = ComponentEvent,
> extends EventEmitter<T> {
  protected readonly logger: Logger;
  protected readonly config: ErgomaticConfig;

  constructor(config: ErgomaticConfig) {
    super();

    this.config = config;
    this.logger = createLogger(this.name(), config.logLevel);
  }

  start(): Promise<void> {
    return Promise.resolve();
  }

  stop(): Promise<void> {
    return Promise.resolve();
  }

  abstract name(): string;
}
