import { Logger } from "std/log/mod.ts";
import { Plugin } from "./plugin.ts";
import { ErgomaticConfig, PluginConfigEntry } from "../config.ts";
import { createLogger } from "../log.ts";
import { ErgomaticConfigError } from "../error.ts";
import { pluginConstructorMap } from "../../plugins/mod.ts";
import { EventEmitter } from "../event_emitter.ts";

interface PluginManagerEvent {
  "plugin:error": CustomEvent<{ plugin: Plugin; error: Error }>;
}

enum PluginState {
  Stopped,
  Running,
  Error,
}

interface ManagedPlugin {
  plugin: Plugin;
  state: PluginState;
}

export class PluginManager extends EventEmitter<PluginManagerEvent> {
  private readonly logger: Logger;
  #plugins: ManagedPlugin[];

  constructor(config: ErgomaticConfig) {
    super();

    this.logger = createLogger("PluginManager", config.logLevel);
    this.#plugins = config.plugins.filter((p) => p.enabled).map((
      pluginEntry,
    ) => ({
      plugin: this.#createPlugin(config, pluginEntry),
      state: PluginState.Stopped,
    }));
  }

  public async start(): Promise<void> {
    this.logger.debug("Starting plugins");

    const promises = this.#pluginsByState(PluginState.Stopped).map(async (
      managedPlugin,
    ) => {
      try {
        await managedPlugin.plugin.onStart();

        managedPlugin.state = PluginState.Running;
      } catch (e) {
        this.#handlePluginError(managedPlugin, e);
      }
    });

    await Promise.allSettled(promises);
  }

  public async stop(): Promise<void> {
    this.logger.debug("Stopping plugins");

    const promises = this.#pluginsByState(PluginState.Running).map(async (
      managedPlugin,
    ) => {
      try {
        await managedPlugin.plugin.onStop();

        managedPlugin.state = PluginState.Stopped;
      } catch (e) {
        this.#handlePluginError(managedPlugin, e);
      }
    });

    await Promise.allSettled(promises);
  }

  #handlePluginError(managedPlugin: ManagedPlugin, error: Error): void {
    managedPlugin.state = PluginState.Error;

    this.dispatchEvent(
      new CustomEvent("plugin:error", {
        detail: { plugin: managedPlugin.plugin, error },
      }),
    );
  }

  #pluginsByState(state: PluginState): ManagedPlugin[] {
    return this.#plugins.filter((p) => p.state === state);
  }

  #createPlugin(
    config: ErgomaticConfig,
    pluginEntry: PluginConfigEntry,
  ): Plugin {
    const pluginCtor = pluginConstructorMap[pluginEntry.id];

    this.logger.debug(
      `Creating plugin from config: ${JSON.stringify(pluginEntry)}`,
    );

    if (!pluginCtor) {
      throw new ErgomaticConfigError(`Unknown plugin ID: '${pluginEntry.id}'`);
    }

    return new pluginCtor({
      config,
      logger: createLogger(pluginEntry.id, config.logLevel),
    });
  }
}
