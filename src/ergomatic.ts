import { PluginManager, PluginManagerEvent } from "./plugins/plugin_manager.ts";
import { ErgomaticConfig } from "./config.ts";
import { Component } from "./component.ts";
import {
  BlockchainProvider,
  DefaultBlockchainProvider,
} from "./blockchain/mod.ts";

interface ErgomaticEvent {
  "component:error": CustomEvent<{ component: Component; error: Error }>;
  "plugin:error": PluginManagerEvent["plugin:error"];
}

interface ErgomaticOpts {
  config: ErgomaticConfig;
  pluginManager?: PluginManager;
  blockchainProvider?: BlockchainProvider;
}

export class Ergomatic extends Component<ErgomaticEvent> {
  #isRunning = false;
  readonly #components: Component[];

  constructor(opts: ErgomaticOpts) {
    super(opts.config, "Ergomatic");

    const blockchainProvider = opts.blockchainProvider ??
      new DefaultBlockchainProvider(opts.config);
    const pluginManager = opts.pluginManager ??
      new PluginManager(opts.config, blockchainProvider);

    pluginManager.addEventListener("plugin:error", (e) => this.#bubbleEvent(e));

    this.#components = [pluginManager];
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
