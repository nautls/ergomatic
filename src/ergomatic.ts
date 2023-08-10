import { PluginManager } from "./plugins/plugin_manager.ts";
import { ErgomaticConfig } from "./config.ts";
import { Component } from "./component.ts";

export class Ergomatic extends Component {
  private readonly pluginManager: PluginManager;

  constructor(config: ErgomaticConfig) {
    super(config);

    this.pluginManager = new PluginManager(config);
  }

  name(): string {
    return "Ergomatic";
  }

  public async start(): Promise<void> {
    this.logger.debug("Starting Ergomatic");

    await this.pluginManager.start();
  }

  public async stop(): Promise<void> {
    this.logger.debug("Stopping Ergomatic");

    await this.pluginManager.stop();
  }
}
