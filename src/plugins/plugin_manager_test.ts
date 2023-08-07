import { assert, assertEquals, assertThrows } from "std/testing/asserts.ts";
import { spy, stub } from "std/testing/mock.ts";
import { beforeEach, describe, it } from "std/testing/bdd.ts";
import { ErgomaticConfig, mergeUserConfigAndValidate } from "../config.ts";
import { PluginManager } from "./mod.ts";
import { Plugin, PluginDescriptor } from "./plugin.ts";
import { ErgomaticConfigError } from "../error.ts";

const _pluginInternals = {
  onStart: () => Promise.resolve(),
  onStop: () => Promise.resolve(),
};

class TestPlugin extends Plugin {
  get descriptor(): PluginDescriptor {
    throw new Error("Method not implemented.");
  }

  onStart(): Promise<void> {
    return _pluginInternals.onStart();
  }

  onStop(): Promise<void> {
    return _pluginInternals.onStop();
  }
}

const testMap = { "test-plugin": TestPlugin };

function testConfig() {
  return mergeUserConfigAndValidate({
    plugins: [{ enabled: true, id: "test-plugin" }],
  });
}

describe("PluginManager", () => {
  let config: ErgomaticConfig;

  beforeEach(() => {
    config = testConfig();
  });

  describe("constructor", () => {
    it("should throw for enabled invalid plugin id", () => {
      config.plugins[0]!.id = "invalid";

      assertThrows(
        () => new PluginManager(config, testMap),
        ErgomaticConfigError,
        "Unknown plugin ID",
      );
    });
    it("should not throw for disabled invalid plugin id", () => {
      config.plugins[0]!.id = "invalid";
      config.plugins[0]!.enabled = false;

      new PluginManager(config, testMap);
    });
    it("should create PluginManager instance", () => {
      new PluginManager(config, testMap);
    });
  });

  describe("start()", () => {
    it("should call onStart for managed plugins", async () => {
      const pluginManager = new PluginManager(config, testMap);
      const onStartSpy = spy(_pluginInternals, "onStart");

      try {
        await pluginManager.start();

        assertEquals(onStartSpy.calls.length, 1);
      } finally {
        onStartSpy.restore();
      }
    });
    it("should raise plugin:error event if managed plugin onStart throws", async () => {
      const pluginManager = new PluginManager(config, testMap);
      const err = new Error("pluginError");
      const onStartStub = stub(
        _pluginInternals,
        "onStart",
        () => {
          throw err;
        },
      );
      const dispatchSpy = spy(pluginManager, "dispatchEvent");

      try {
        await pluginManager.start();

        assertEquals(dispatchSpy.calls.length, 1);
        const [{ type, detail }] = dispatchSpy.calls[0].args as [CustomEvent];

        assertEquals(type, "plugin:error");
        assertEquals(detail.error, err);
        assert(detail.plugin instanceof TestPlugin);
      } finally {
        onStartStub.restore();
      }
    });
    it("should only call onStart for stopped plugins", async () => {
      const pluginManager = new PluginManager(config, testMap);

      await pluginManager.start();
    });
  });
});
