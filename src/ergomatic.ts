import { PluginManager } from "./plugins/plugin_manager.ts";
import { ErgomaticConfig } from "./config.ts";
import { Component } from "./component.ts";

interface ErgomaticEvent {
  "component:error": CustomEvent<{ component: Component; error: Error }>;
}

interface ErgomaticOpts {
  config: ErgomaticConfig;
  pluginManager?: PluginManager;
}

export class Ergomatic extends Component<ErgomaticEvent> {
  #isRunning = false;
  readonly #components: Component[];

  constructor(opts: ErgomaticOpts) {
    super(opts.config, "Ergomatic");

    const pluginManager = opts.pluginManager ?? new PluginManager(opts.config);

    this.#components = [pluginManager];
  }

  public async start(): Promise<void> {
    if (this.#isRunning) {
      this.logger.warning("Ergomatic is already running");

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
      this.logger.warning("Ergomatic is not running");

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
    this.logger.debug(`Component ${component.name} failed: ${error}`);

    this.dispatchEvent(
      new CustomEvent("component:error", { detail: { component, error } }),
    );
  }
}
