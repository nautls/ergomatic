import { assertEquals, assertThrows } from "std/testing/asserts.ts";
import { assertSpyCalls, spy, stub } from "std/testing/mock.ts";
import { beforeEach, describe, it } from "std/testing/bdd.ts";
import { ErgomaticConfig } from "../config.ts";
import { PluginManager } from "./mod.ts";
import { ErgomaticConfigError } from "../error.ts";
import { PluginState } from "./plugin_manager.ts";
import {
  mkTestManagedPlugin,
  mkTestPluginManager,
  testPluginMap,
} from "./_testing.ts";
import { BlockchainClient, BlockchainProvider } from "../blockchain/mod.ts";
import { testConfig } from "../_testing.ts";

describe("PluginManager", () => {
  let config: ErgomaticConfig;
  let blockchainClient: BlockchainClient;

  beforeEach(() => {
    config = testConfig();
    blockchainClient = new BlockchainProvider(config);
  });

  describe("constructor", () => {
    it("should throw for enabled invalid plugin id", () => {
      config.plugins[0]!.id = "invalid";

      assertThrows(
        () => new PluginManager(config, blockchainClient, testPluginMap),
        ErgomaticConfigError,
        "Unknown plugin ID",
      );
    });
    it("should not throw for disabled invalid plugin id", () => {
      config.plugins[0]!.id = "invalid";
      config.plugins[0]!.enabled = false;

      new PluginManager(config, blockchainClient, testPluginMap);
    });
    it("should create PluginManager instance", () => {
      new PluginManager(config, blockchainClient, testPluginMap);
    });
  });

  describe("start()", () => {
    it("should call onStart for stopped plugins", async () => {
      const startedPlugin = mkTestManagedPlugin(PluginState.Running);
      const startedSpy = spy(startedPlugin.plugin, "onStart");
      const erroredPlugin = mkTestManagedPlugin(PluginState.Error);
      const erroredSpy = spy(erroredPlugin.plugin, "onStart");
      const stoppedPlugin = mkTestManagedPlugin(PluginState.Stopped);
      const stoppedSpy = spy(stoppedPlugin.plugin, "onStart");
      const { pluginManager, cleanup } = mkTestPluginManager({
        plugins: [
          startedPlugin,
          stoppedPlugin,
          erroredPlugin,
        ],
      });

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
      const managedPlugin = mkTestManagedPlugin(PluginState.Stopped);
      const { pluginManager, cleanup } = mkTestPluginManager({
        plugins: [managedPlugin],
      });
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
      const startedPlugin = mkTestManagedPlugin(PluginState.Running);
      const startedSpy = spy(startedPlugin.plugin, "onStop");
      const erroredPlugin = mkTestManagedPlugin(PluginState.Error);
      const erroredSpy = spy(erroredPlugin.plugin, "onStop");
      const stoppedPlugin = mkTestManagedPlugin(PluginState.Stopped);
      const stoppedSpy = spy(stoppedPlugin.plugin, "onStop");
      const { pluginManager, cleanup } = mkTestPluginManager({
        plugins: [
          startedPlugin,
          stoppedPlugin,
          erroredPlugin,
        ],
      });

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
      const managedPlugin = mkTestManagedPlugin(PluginState.Running);
      const { pluginManager, cleanup } = mkTestPluginManager({
        plugins: [managedPlugin],
      });
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

  describe("activePlugins", () => {
    it("should only return running plugins", () => {
      const startedPlugin = mkTestManagedPlugin(PluginState.Running);
      const startedPlugin2 = mkTestManagedPlugin(PluginState.Running);
      const { pluginManager, cleanup } = mkTestPluginManager({
        plugins: [
          startedPlugin,
          mkTestManagedPlugin(PluginState.Error),
          mkTestManagedPlugin(PluginState.Stopped),
          startedPlugin2,
        ],
      });

      try {
        assertEquals(pluginManager.activePlugins, [
          startedPlugin.plugin,
          startedPlugin2.plugin,
        ]);
      } finally {
        cleanup();
      }
    });
  });
});
