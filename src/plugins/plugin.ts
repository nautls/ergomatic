import { Logger } from "std/log/mod.ts";

export interface PluginDescriptor {
  /** User friendly name of the plugin. */
  get name(): string;

  /** Description of the plugin. */
  get description(): string;

  /** Version of the plugin in semantic version format. */
  get version(): string;
}

type PluginConfig = Record<string, unknown>;

export type PluginConstructor = {
  new (args: PluginArgs): Plugin;
};

export interface PluginArgs<T extends PluginConfig = PluginConfig> {
  config: T;
  logger: Logger;
}

export abstract class Plugin<T extends PluginConfig = PluginConfig> {
  /** Plugin specific configuration provided in the ergomatic config file. */
  protected readonly config: T;

  /** Logger configured to log output of this plugin. */
  protected readonly logger: Logger;

  constructor({ config, logger }: PluginArgs<T>) {
    this.config = config;
    this.logger = logger;
  }

  onCreated(): Promise<void> {
    return Promise.resolve();
  }

  onDestroyed(): Promise<void> {
    return Promise.resolve();
  }

  abstract get descriptor(): PluginDescriptor;
}
