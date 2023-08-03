import { Plugin, PluginDescriptor } from "../../src/plugins/mod.ts";

export const EXAMPLE_PLUGIN_ID = "example_plugin";

interface ExamplePluginConfig {
  someValue: number;
}

export class ExamplePlugin extends Plugin<ExamplePluginConfig> {
  get descriptor(): PluginDescriptor {
    return {
      name: "Example Plugin",
      description:
        "This is an example plugin showcasing how to create & implement ergomatic plugins.",
      version: "0.1.0",
    };
  }

  onStart(): Promise<void> {
    this.logger.info(
      `Example plugin started with config: ${JSON.stringify(this.config)}`,
    );

    return Promise.resolve();
  }
}
