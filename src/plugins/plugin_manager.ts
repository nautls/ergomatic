import { Logger } from "std/log/mod.ts";
import { Plugin, PluginConstructor, PluginDescriptor } from "./plugin.ts";
import { ErgomaticConfig, PluginConfigEntry } from "../config.ts";
import { createLogger } from "../log.ts";

class ExamplePlugin extends Plugin {
  get descriptor(): PluginDescriptor {
    throw new Error("Method not implemented.");
  }
}

const pluginIdToConstructorMap: Record<string, PluginConstructor> = {
  "example-plugin": ExamplePlugin,
};

export class PluginManager {
  private readonly config: ErgomaticConfig;
  private readonly logger: Logger;
  private readonly plugins: Plugin[];

  constructor(config: ErgomaticConfig) {
    this.config = config;
    this.logger = createLogger("PluginManager", config.logLevel);

    this.plugins = config.plugins.filter((p) => p.enabled).map((pluginConfig) =>
      this.#createPlugin(config, pluginConfig)
    );
  }

  #createPlugin(
    config: ErgomaticConfig,
    pluginEntry: PluginConfigEntry,
  ): Plugin {
    const pluginCtor = pluginIdToConstructorMap[pluginEntry.id];

    if (!pluginCtor) {
      throw new Error(`Unknown plugin ID: '${pluginEntry.id}'`);
    }

    return new pluginCtor({
      config,
      logger: createLogger(pluginEntry.id, config.logLevel),
    });
  }
}
