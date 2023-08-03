import { PluginConstructor } from "../src/plugins/plugin.ts";
import { EXAMPLE_PLUGIN_ID, ExamplePlugin } from "./example_plugin/mod.ts";

export const pluginConstructorMap: Record<string, PluginConstructor> = {
  [EXAMPLE_PLUGIN_ID]: ExamplePlugin,
};