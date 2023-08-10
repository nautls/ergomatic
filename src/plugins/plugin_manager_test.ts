import { assertEquals, assertThrows } from "std/testing/asserts.ts";
import { assertSpyCalls, spy, stub } from "std/testing/mock.ts";
import { beforeEach, describe, it } from "std/testing/bdd.ts";
import { ErgomaticConfig } from "../config.ts";
import { PluginManager } from "./mod.ts";
import { ErgomaticConfigError } from "../error.ts";
import { PluginState } from "./plugin_manager.ts";
import {
  mkManagedPlugin,
  mkPluginManager,
  testConfig,
  testPluginMap,
} from "./_test_utils.ts";

describe("PluginManager", () => {
  let config: ErgomaticConfig;

  beforeEach(() => {
    config = testConfig();
  });

  describe("constructor", () => {
    it("should throw for enabled invalid plugin id", () => {
      config.plugins[0]!.id = "invalid";

      assertThrows(
        () => new PluginManager(config, testPluginMap),
        ErgomaticConfigError,
        "Unknown plugin ID",
      );
    });
    it("should not throw for disabled invalid plugin id", () => {
      config.plugins[0]!.id = "invalid";
      config.plugins[0]!.enabled = false;

      new PluginManager(config, testPluginMap);
    });
    it("should create PluginManager instance", () => {
      new PluginManager(config, testPluginMap);
    });
  });

  describe("start()", () => {
    it("should call onStart for stopped plugins", async () => {
      const startedPlugin = mkManagedPlugin(PluginState.Running);
      const startedSpy = spy(startedPlugin.plugin, "onStart");
      const erroredPlugin = mkManagedPlugin(PluginState.Error);
      const erroredSpy = spy(erroredPlugin.plugin, "onStart");
      const stoppedPlugin = mkManagedPlugin(PluginState.Stopped);
      const stoppedSpy = spy(stoppedPlugin.plugin, "onStart");
      const { pluginManager, cleanup } = mkPluginManager([
        startedPlugin,
        stoppedPlugin,
        erroredPlugin,
      ]);

      try {
        await pluginManager.start();

        assertSpyCalls(startedSpy, 0);
        assertSpyCalls(erroredSpy, 0);
        assertSpyCalls(stoppedSpy, 1);
      } finally {
        cleanup();
        startedSpy.restore();
        erroredSpy.restore();
        stoppedSpy.restore();
      }
    });

    it("should raise plugin:error event if managed plugin onStart throws", async () => {
      const managedPlugin = mkManagedPlugin(PluginState.Stopped);
      const { pluginManager, cleanup } = mkPluginManager([managedPlugin]);
      const err = new Error("pluginError");
      const methodStub = stub(
        managedPlugin.plugin,
        "onStart",
        () => {
          throw err;
        },
      );
      const dispatchSpy = spy(pluginManager, "dispatchEvent");

      try {
        await pluginManager.start();

        assertSpyCalls(dispatchSpy, 1);

        const [{ type, detail }] = dispatchSpy.calls[0].args as [CustomEvent];

        assertEquals(type, "plugin:error");
        assertEquals(detail.error, err);
        assertEquals(detail.plugin, managedPlugin.plugin);
      } finally {
        cleanup();
        methodStub.restore();
      }
    });
  });

  describe("stop()", () => {
    it("should call onStop for running plugins", async () => {
      const startedPlugin = mkManagedPlugin(PluginState.Running);
      const startedSpy = spy(startedPlugin.plugin, "onStop");
      const erroredPlugin = mkManagedPlugin(PluginState.Error);
      const erroredSpy = spy(erroredPlugin.plugin, "onStop");
      const stoppedPlugin = mkManagedPlugin(PluginState.Stopped);
      const stoppedSpy = spy(stoppedPlugin.plugin, "onStop");
      const { pluginManager, cleanup } = mkPluginManager([
        startedPlugin,
        stoppedPlugin,
        erroredPlugin,
      ]);

      try {
        await pluginManager.stop();

        assertSpyCalls(startedSpy, 1);
        assertSpyCalls(erroredSpy, 0);
        assertSpyCalls(stoppedSpy, 0);
      } finally {
        cleanup();
        startedSpy.restore();
        erroredSpy.restore();
        stoppedSpy.restore();
      }
    });
    it("should raise plugin:error event if managed plugin onStop throws", async () => {
      const managedPlugin = mkManagedPlugin(PluginState.Running);
      const { pluginManager, cleanup } = mkPluginManager([managedPlugin]);
      const err = new Error("pluginError");
      const methodStub = stub(
        managedPlugin.plugin,
        "onStop",
        () => {
          throw err;
        },
      );
      const dispatchSpy = spy(pluginManager, "dispatchEvent");

      try {
        await pluginManager.stop();

        assertSpyCalls(dispatchSpy, 1);
        const [{ type, detail }] = dispatchSpy.calls[0].args as [CustomEvent];

        assertEquals(type, "plugin:error");
        assertEquals(detail.error, err);
        assertEquals(detail.plugin, managedPlugin.plugin);
      } finally {
        cleanup();
        methodStub.restore();
      }
    });
  });
});
