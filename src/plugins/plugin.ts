import { Logger } from "std/log/mod.ts";
import { BlockchainClient } from "../blockchain/mod.ts";
import { SignedTransaction } from "@fleet-sdk/common";

export interface PluginDescriptor {
  /** User friendly name of the plugin. */
  get name(): string;

  /** Description of the plugin. */
  get description(): string;

  /** Version of the plugin in semantic version format. */
  get version(): string;
}

export type PluginConstructor = {
  new (args: PluginArgs): Plugin;
};

// deno-lint-ignore no-explicit-any
export interface PluginArgs<T = any> {
  config: T;
  logger: Logger;
  blockchainClient: BlockchainClient;
}

export abstract class Plugin<T = unknown> {
  /** Plugin specific configuration provided in the ergomatic config file. */
  protected readonly config: T;

  /** Logger configured to log output of this plugin. */
  protected readonly logger: Logger;

  protected readonly blockchainClient: BlockchainClient;

  constructor({ config, logger, blockchainClient }: PluginArgs<T>) {
    this.config = config;
    this.logger = logger;
    this.blockchainClient = blockchainClient;
  }

  /**
   * Called on start-up of ergomatic.
   * Plugin initialization should be done here.
   */
  onStart(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Called on shutdown of ergomatic.
   * Plugin clean-up should be done here.
   */
  onStop(): Promise<void> {
    return Promise.resolve();
  }

  /** Called when a new transaction is added to mempool. */
  onMempoolTx(_tx: SignedTransaction): Promise<void> {
    return Promise.resolve();
  }

  abstract get descriptor(): PluginDescriptor;
}
