import { Logger } from "std/log/mod.ts";
import { BlockchainProvider, BlockchainSnapshot } from "../blockchain/mod.ts";
import { Block, SignedTransaction } from "@fleet-sdk/common";
import { z } from "zod/mod.ts";

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
  blockchainProvider: BlockchainProvider;
}

export abstract class Plugin<T = unknown> {
  /** Plugin specific configuration provided in the ergomatic config file. */
  protected readonly config: T;

  /** Logger configured to log output of this plugin. */
  protected readonly logger: Logger;

  protected readonly blockchainProvider: BlockchainProvider;

  constructor({ config, logger, blockchainProvider }: PluginArgs<T>) {
    this.config = config;
    this.logger = logger;
    this.blockchainProvider = blockchainProvider;
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
  onMempoolTx(
    _tx: SignedTransaction,
    _snapshot: Readonly<BlockchainSnapshot>,
  ): Promise<void> {
    return Promise.resolve();
  }

  /** Called when a transaction is dropped from mempool without being included in a block. */
  onMempoolTxDrop(
    _tx: SignedTransaction,
    _snapshot: Readonly<BlockchainSnapshot>,
  ): Promise<void> {
    return Promise.resolve();
  }

  /** Called when a transaction has been included in a block. */
  onIncludedTx(
    _tx: SignedTransaction,
    _snapshot: Readonly<BlockchainSnapshot>,
  ): Promise<void> {
    return Promise.resolve();
  }

  /** Called when a new block is added to the blockchain. */
  onNewBlock(
    _block: Block,
    _snapshot: Readonly<BlockchainSnapshot>,
  ): Promise<void> {
    return Promise.resolve();
  }

  /**
   * The `configSchema` is used to validate the user supplied configuration
   * in the `ergomatic` config file. The schema is applied to the {@link T} type.
   *
   * LSPs auto-complete the function signature for this function to be a complex
   * ZodObject<..> return type, you can safely use `z.ZodObject<any>` like below to simplify it.
   *
   * @example
   * ```ts
   *   // deno-lint-ignore no-explicit-any
   * configSchema(): z.ZodObject<any> | undefined {
   *   return z.object({
   *     tokenId: z.string(),
   *     exitAtPage: z.number().optional(),
   *   });
   * }
   * ```
   *
   * @returns Zod schema if the config should be validated by
   * `ergomatic` otherwise `undefined`.
   */
  // deno-lint-ignore no-explicit-any
  configSchema(): z.ZodObject<any> | undefined {
    return;
  }

  /**
   * @throws {ZodError} If the config doesn't pass the schema provided by {@link configSchema}.
   */
  validateConfig(): void {
    this.configSchema()?.parse(this.config);
  }

  abstract get descriptor(): PluginDescriptor;
}
