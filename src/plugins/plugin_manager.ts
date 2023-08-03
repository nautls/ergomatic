import { Logger } from "std/log/mod.ts";
import { Plugin } from "./plugin.ts";
import { ErgomaticConfig, PluginConfigEntry } from "../config.ts";
import { createLogger } from "../log.ts";
import { ErgomaticConfigError } from "../error.ts";
import { pluginConstructorMap } from "../../plugins/mod.ts";

export class PluginManager {
  private readonly logger: Logger;
  private readonly plugins: Plugin[];

  constructor(config: ErgomaticConfig) {
    this.logger = createLogger("PluginManager", config.logLevel);

    this.plugins = config.plugins.filter((p) => p.enabled).map((pluginEntry) =>
      this.#createPlugin(config, pluginEntry)
    );
  }

  public start(): Promise<void> {
    this.logger.debug("Starting plugins");

    return Promise.resolve();
  }

  public stop(): Promise<void> {
    this.logger.debug("Stopping plugins");

    return Promise.resolve();
  }

  #createPlugin(
    config: ErgomaticConfig,
    pluginEntry: PluginConfigEntry,
  ): Plugin {
    const pluginCtor = pluginConstructorMap[pluginEntry.id];

    if (!pluginCtor) {
      throw new ErgomaticConfigError(`Unknown plugin ID: '${pluginEntry.id}'`);
    }

    this.logger.debug(
      `Creating plugin from config: ${JSON.stringify(pluginEntry)}`,
    );

    return new pluginCtor({
      config,
      logger: createLogger(pluginEntry.id, config.logLevel),
    });
  }
}
