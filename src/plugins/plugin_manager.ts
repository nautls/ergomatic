import { Plugin, PluginConstructor } from "./plugin.ts";
import { ErgomaticConfig, PluginConfigEntry } from "../config.ts";
import { createLogger } from "../log.ts";
import { ErgomaticConfigError } from "../error.ts";
import { pluginConstructorMap } from "../../plugins/mod.ts";
import { Component } from "../component.ts";

interface PluginManagerEvent {
  "plugin:error": CustomEvent<{ plugin: Plugin; error: Error }>;
}

export enum PluginState {
  Stopped,
  Running,
  Error,
}

export interface ManagedPlugin {
  plugin: Plugin;
  state: PluginState;
}

export const _internals = {
  /** Allow mocking managed plugins in tests. */
  plugins(plugins: ManagedPlugin[]) {
    return plugins;
  },
};

export class PluginManager extends Component<PluginManagerEvent> {
  readonly #pluginConstructorMap: Record<string, PluginConstructor>;
  #_plugins: ManagedPlugin[];

  constructor(config: ErgomaticConfig, pluginCtorMap = pluginConstructorMap) {
    super(config, "PluginManager");

    this.#pluginConstructorMap = pluginCtorMap;
    this.#_plugins = config.plugins.filter((p) => p.enabled).map((
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

  get #plugins() {
    return _internals.plugins(this.#_plugins);
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
    const pluginCtor = this.#pluginConstructorMap[pluginEntry.id];

    this.logger.debug(
      `Creating plugin from config: ${JSON.stringify(pluginEntry)}`,
    );

    if (!pluginCtor) {
      throw new ErgomaticConfigError(`Unknown plugin ID: '${pluginEntry.id}'`);
    }

    return new pluginCtor({
      config: pluginEntry.config,
      logger: createLogger(pluginEntry.id, config.logLevel),
    });
  }
}
