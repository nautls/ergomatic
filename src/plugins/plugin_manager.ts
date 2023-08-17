import { Plugin, PluginConstructor } from "./plugin.ts";
import { ErgomaticConfig, PluginConfigEntry } from "../config.ts";
import { createLogger } from "../log.ts";
import { ErgomaticConfigError } from "../error.ts";
import { pluginConstructorMap } from "../../plugins/mod.ts";
import { Component } from "../component.ts";
import { BlockchainClient, BlockchainMonitor } from "../blockchain/mod.ts";

export interface PluginManagerEvent {
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
  managedPlugins(plugins: ManagedPlugin[]) {
    return plugins;
  },
};

export class PluginManager extends Component<PluginManagerEvent> {
  readonly #pluginConstructorMap: Record<string, PluginConstructor>;
  readonly #blockchainClient: BlockchainClient;
  readonly #blockchainMonitor: BlockchainMonitor;
  #_plugins: ManagedPlugin[];

  constructor(
    config: ErgomaticConfig,
    blockchainClient: BlockchainClient,
    blockchainMonitor: BlockchainMonitor,
    pluginCtorMap = pluginConstructorMap,
  ) {
    super(config, "PluginManager");

    this.#blockchainClient = blockchainClient;
    this.#blockchainMonitor = blockchainMonitor;
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

    // these event listeners aren't cleaned up in stop()
    // probably wont be a issue because starting/stopping ergomatic is unlikely to be a thing.
    // But if it does happen for some reason then event handlers will be called twice after the 2nd start.
    // TODO: fix this if it is a problem
    this.#blockchainMonitor.addEventListener(
      "monitor:mempool-tx",
      ({ detail }) =>
        this.#pluginsByState(PluginState.Running).forEach((p) =>
          p.plugin.onMempoolTx(detail).catch((e) =>
            this.#handlePluginError(p, e)
          )
        ),
    );

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

  get #managedPlugins() {
    return _internals.managedPlugins(this.#_plugins);
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
    return this.#managedPlugins.filter((p) => p.state === state);
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
      blockchainClient: this.#blockchainClient,
      logger: createLogger(pluginEntry.id, config.logLevel),
    });
  }
}
