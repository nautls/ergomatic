import { Block, SignedTransaction } from "@fleet-sdk/common";
import { BlockchainSnapshot } from "../../src/blockchain/blockchain_monitor.ts";
import { Plugin, PluginDescriptor } from "../../src/plugins/mod.ts";
import { z } from "zod/mod.ts";

export const _TEMPLATE_PLUGIN_ID = "_template_plugin";

interface _TemplatePluginConfig {
  configValue: string;
  otherConfigValue: number;
}

export class _TemplatePlugin extends Plugin<_TemplatePluginConfig> {
  get descriptor(): PluginDescriptor {
    return {
      // Human readable name of your plugin
      name: "Template Plugin",
      // Description of your plugins functionality and anything else users should be aware of
      description:
        "Template for developers to get started creating their own plugins",
      // Version of your plugin
      version: "0.1.0",
    };
  }

  onStart(): Promise<void> {
    this.logger.info(`started with configuration: ${this.config}`);

    return Promise.resolve();
  }

  onStop(): Promise<void> {
    this.logger.info("Plugin shutting down, performing cleanup!");

    return Promise.resolve();
  }

  onNewBlock(
    block: Block,
    snapshot: Readonly<BlockchainSnapshot>,
  ): Promise<void> {
    this.logger.info(`block: ${block}, snapshot: ${snapshot}`);

    return Promise.resolve();
  }

  onMempoolTx(
    tx: SignedTransaction,
    snapshot: Readonly<BlockchainSnapshot>,
  ): Promise<void> {
    this.logger.info(`mempool tx: ${tx}, snapshot: ${snapshot}`);

    return Promise.resolve();
  }

  onIncludedTx(
    tx: SignedTransaction,
    snapshot: Readonly<BlockchainSnapshot>,
  ): Promise<void> {
    this.logger.info(`tx included in block: ${tx}, snapshot: ${snapshot}`);

    return Promise.resolve();
  }

  onMempoolTxDrop(
    tx: SignedTransaction,
    snapshot: Readonly<BlockchainSnapshot>,
  ): Promise<void> {
    this.logger.warning(
      `tx dropped from mempool without being included in block: ${tx}, snapshot: ${snapshot}`,
    );

    return Promise.resolve();
  }

  // deno-lint-ignore no-explicit-any
  configSchema(): z.ZodObject<any> | undefined {
    return z.object({
      configValue: z.string(),
      otherConfigValue: z.number(),
    });
  }
}
