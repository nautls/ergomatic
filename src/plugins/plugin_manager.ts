import { Plugin, PluginConstructor } from "./plugin.ts";
import { ErgomaticConfig, PluginConfigEntry } from "../config.ts";
import { createLogger } from "../log.ts";
import { ErgomaticConfigError } from "../error.ts";
import { pluginConstructorMap } from "../../plugins/mod.ts";
import { Component } from "../component.ts";
import { BlockchainMonitor, BlockchainProvider } from "../blockchain/mod.ts";

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
  readonly #blockchainProvider: BlockchainProvider;
  #_plugins: ManagedPlugin[];

  constructor(
    config: ErgomaticConfig,
    blockchainProvider: BlockchainProvider,
    blockchainMonitor: BlockchainMonitor,
    pluginCtorMap = pluginConstructorMap,
  ) {
    super(config, "PluginManager");

    this.#blockchainProvider = blockchainProvider;
    this.#pluginConstructorMap = pluginCtorMap;
    this.#_plugins = config.plugins
      .filter((p) => p.enabled)
      .map((pluginEntry) => ({
        plugin: this.#createPlugin(config, pluginEntry),
        state: PluginState.Stopped,
      }));

    this.#setupEventHandlers(blockchainMonitor);
  }

  public async start(): Promise<void> {
    this.logger.debug("Starting plugins");

    const promises = this.#pluginsByState(PluginState.Stopped).map(
      async (managedPlugin) => {
        try {
          managedPlugin.plugin.validateConfig();
          await managedPlugin.plugin.onStart();

          managedPlugin.state = PluginState.Running;
        } catch (e) {
          this.#handlePluginError(managedPlugin, e);
        }
      },
    );

    await Promise.allSettled(promises);
  }

  public async stop(): Promise<void> {
    this.logger.debug("Stopping plugins");

    const promises = this.#pluginsByState(PluginState.Running).map(
      async (managedPlugin) => {
        try {
          await managedPlugin.plugin.onStop();

          managedPlugin.state = PluginState.Stopped;
        } catch (e) {
          this.#handlePluginError(managedPlugin, e);
        }
      },
    );

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
    ergomaticConfig: ErgomaticConfig,
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
      blockchainProvider: this.#blockchainProvider,
      logger: createLogger(
        `plugin::${pluginEntry.id}`,
        pluginEntry.logLevel ?? ergomaticConfig.logLevel,
      ),
    });
  }

  #setupEventHandlers(blockchainMonitor: BlockchainMonitor) {
    blockchainMonitor.addEventListener(
      "monitor:mempool-tx",
      ({ detail }) =>
        this.#pluginsByState(PluginState.Running).forEach((p) =>
          p.plugin
            .onMempoolTx(...detail)
            .catch((e) => this.#handlePluginError(p, e))
        ),
    );
    blockchainMonitor.addEventListener(
      "monitor:mempool-tx-drop",
      ({ detail }) =>
        this.#pluginsByState(PluginState.Running).forEach((p) =>
          p.plugin
            .onMempoolTxDrop(...detail)
            .catch((e) => this.#handlePluginError(p, e))
        ),
    );
    blockchainMonitor.addEventListener(
      "monitor:included-tx",
      ({ detail }) =>
        this.#pluginsByState(PluginState.Running).forEach((p) =>
          p.plugin
            .onIncludedTx(...detail)
            .catch((e) => this.#handlePluginError(p, e))
        ),
    );
    blockchainMonitor.addEventListener(
      "monitor:new-block",
      ({ detail }) =>
        this.#pluginsByState(PluginState.Running).forEach((p) =>
          p.plugin
            .onNewBlock(...detail)
            .catch((e) => this.#handlePluginError(p, e))
        ),
    );
  }
}
