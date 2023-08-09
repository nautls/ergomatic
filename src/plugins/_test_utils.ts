import { getLogger } from "std/log/mod.ts";
import { Plugin, PluginDescriptor } from "./plugin.ts";
import { _internals, ManagedPlugin, PluginState } from "./plugin_manager.ts";
import { mergeUserConfigAndValidate } from "../config.ts";
import { PluginManager } from "./mod.ts";
import { stub } from "std/testing/mock.ts";

interface PluginInternals {
  onStart(): Promise<void>;
  onStop(): Promise<void>;
}

export const _testPluginInternals: PluginInternals = {
  onStart: () => Promise.resolve(),
  onStop: () => Promise.resolve(),
};

export class TestPlugin extends Plugin {
  /** Allows for mocking/spying on functions */
  readonly #internals: PluginInternals;

  constructor(
    args: ConstructorParameters<typeof Plugin>[0],
    internals = _testPluginInternals,
  ) {
    super(args);
    this.#internals = internals;
  }

  get descriptor(): PluginDescriptor {
    throw new Error("Method not implemented.");
  }

  onStart(): Promise<void> {
    return this.#internals.onStart();
  }

  onStop(): Promise<void> {
    return this.#internals.onStop();
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
  internals = _testPluginInternals,
): ManagedPlugin {
  const plugin = new TestPlugin({ logger: getLogger(), config: {} }, internals);

  return {
    state,
    plugin,
  };
}
