import { getLogger } from "std/log/mod.ts";
import { Plugin, PluginDescriptor } from "./plugin.ts";
import { _internals, ManagedPlugin, PluginState } from "./plugin_manager.ts";
import { mergeUserConfigAndValidate } from "../config.ts";
import { PluginManager } from "./mod.ts";
import { stub } from "std/testing/mock.ts";

export class TestPlugin extends Plugin {
  get descriptor(): PluginDescriptor {
    throw new Error("Method not implemented.");
  }
}

export const testPluginMap = { "test-plugin": TestPlugin };

export function testConfig() {
  return mergeUserConfigAndValidate({
    plugins: [{ enabled: true, id: "test-plugin" }],
  });
}

export function mkPluginManager(
  withPlugins: ManagedPlugin[] = [],
  config = testConfig(),
  pluginMap = testPluginMap,
) {
  const pluginsStub = withPlugins.length
    ? stub(_internals, "plugins", () => withPlugins)
    : null;

  const cleanup = () => {
    pluginsStub?.restore();
  };

  return {
    pluginManager: new PluginManager(config, pluginMap),
    cleanup,
  };
}

export function mkManagedPlugin(
  state: PluginState = PluginState.Stopped,
): ManagedPlugin {
  const plugin = new TestPlugin({ logger: getLogger(), config: {} });

  return {
    state,
    plugin,
  };
}
