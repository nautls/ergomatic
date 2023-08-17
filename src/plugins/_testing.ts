import { getLogger } from "std/log/mod.ts";
import { Plugin, PluginConstructor, PluginDescriptor } from "./plugin.ts";
import { _internals, ManagedPlugin, PluginState } from "./plugin_manager.ts";
import { ErgomaticConfig } from "../config.ts";
import { PluginManager } from "./mod.ts";
import { stub } from "std/testing/mock.ts";
import { BlockchainClient, BlockchainProvider } from "../blockchain/mod.ts";
import { testConfig } from "../_testing.ts";

export class TestPlugin extends Plugin {
  get descriptor(): PluginDescriptor {
    throw new Error("Method not implemented.");
  }
}

export const testPluginMap = { "test-plugin": TestPlugin };

interface TestPluginManagerOpts {
  plugins?: ManagedPlugin[];
  config?: ErgomaticConfig;
  pluginMap?: Record<string, PluginConstructor>;
}

export function mkTestPluginManager(
  opts?: TestPluginManagerOpts,
) {
  const pluginsStub = opts?.plugins?.length
    ? stub(_internals, "managedPlugins", () => opts?.plugins!)
    : null;

  const cleanup = () => {
    pluginsStub?.restore();
  };

  const config = opts?.config ?? testConfig();
  const pluginMap = opts?.pluginMap ?? testPluginMap;

  return {
    pluginManager: new PluginManager(
      config,
      new BlockchainProvider(config),
      pluginMap,
    ),
    cleanup,
  };
}

export function mkTestManagedPlugin(
  state: PluginState = PluginState.Stopped,
): ManagedPlugin {
  const plugin = new TestPlugin({
    logger: getLogger(),
    blockchainClient: {} as BlockchainClient, // TODO
    config: {},
  });

  return {
    state,
    plugin,
  };
}
