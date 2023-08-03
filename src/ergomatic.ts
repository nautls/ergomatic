import { Logger } from "std/log/mod.ts";
import { PluginManager } from "./plugins/plugin_manager.ts";
import { ErgomaticConfig } from "./config.ts";
import { createLogger } from "./log.ts";

export class Ergomatic {
  private readonly logger: Logger;
  private readonly pluginManager: PluginManager;

  constructor(config: ErgomaticConfig) {
    this.logger = createLogger("Ergomatic", config.logLevel);
    this.pluginManager = new PluginManager(config);
  }

  public run(): Promise<void> {
    this.logger.debug("Starting Ergomatic");

    return this.pluginManager.start();
  }

  public async stop(): Promise<void> {
    this.logger.debug("Stopping Ergomatic");

    await this.pluginManager.stop();
  }
}
