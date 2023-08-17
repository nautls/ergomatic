import { PluginManager, PluginManagerEvent } from "./plugins/plugin_manager.ts";
import { ErgomaticConfig } from "./config.ts";
import { Component } from "./component.ts";
import {
  BlockchainClient,
  BlockchainMonitor,
  BlockchainProvider,
} from "./blockchain/mod.ts";

interface ErgomaticEvent {
  "component:error": CustomEvent<{ component: Component; error: Error }>;
  "plugin:error": PluginManagerEvent["plugin:error"];
}

interface ErgomaticOpts {
  config: ErgomaticConfig;
  pluginManager?: PluginManager;
  blockchainClient?: BlockchainClient;
  blockchainMonitor?: BlockchainMonitor;
}

export class Ergomatic extends Component<ErgomaticEvent> {
  #isRunning = false;
  readonly #components: Component[];

  constructor(opts: ErgomaticOpts) {
    super(opts.config, "Ergomatic");

    const blockchainClient = opts.blockchainClient ??
      new BlockchainProvider(opts.config);
    const pluginManager = opts.pluginManager ??
      new PluginManager(opts.config, blockchainClient);
    const blockchainMonitor = opts.blockchainMonitor ??
      new BlockchainMonitor(opts.config, blockchainClient);

    pluginManager.addEventListener("plugin:error", (e) => this.#bubbleEvent(e));
    // TODO: handle errors in plugin handlers
    blockchainMonitor.addEventListener(
      "monitor:mempool-tx",
      ({ detail }) =>
        pluginManager.activePlugins.forEach((p) => p.onMempoolTx(detail)),
    );

    this.#components = [pluginManager, blockchainMonitor];
  }

  public async start(): Promise<void> {
    if (this.#isRunning) {
      this.logger.warning("Ergomatic is already running, doing nothing");

      return;
    }

    this.logger.debug("Starting Ergomatic");

    const promises = this.#components.map(async (component) => {
      try {
        this.logger.debug(`Starting component ${component.name}`);

        await component.start();
      } catch (e) {
        this.#onComponentError(component, e);
      }
    });

    await Promise.allSettled(promises);

    this.#isRunning = true;
  }

  public async stop(): Promise<void> {
    if (!this.#isRunning) {
      this.logger.warning("Ergomatic is not running, doing nothing");

      return;
    }

    this.logger.debug("Stopping Ergomatic");

    const promises = this.#components.map(async (component) => {
      try {
        this.logger.debug(`Stopping component ${component.name}`);

        await component.stop();
      } catch (e) {
        this.#onComponentError(component, e);
      }
    });

    await Promise.allSettled(promises);

    this.#isRunning = false;
  }

  #onComponentError(component: Component, error: Error) {
    this.logger.debug(`Component ${component.name} raised exception: ${error}`);

    this.dispatchEvent(
      new CustomEvent("component:error", { detail: { component, error } }),
    );
  }

  #bubbleEvent<T>(evt: CustomEvent<T>) {
    this.dispatchEvent(new CustomEvent(evt.type, { detail: evt.detail }));
  }
}
