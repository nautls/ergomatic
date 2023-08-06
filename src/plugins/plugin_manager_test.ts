import { assertEquals, assertThrows } from "std/testing/asserts.ts";
import { returnsNext, spy, stub } from "std/testing/mock.ts";
import { mergeUserConfigAndValidate } from "../config.ts";
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

Deno.test("PluginManager constructor", async (t) => {
  await t.step("invalid plugin id", async (t) => {
    const cfg = testConfig();
    const plugin = cfg.plugins[0]!;

    plugin.id = "invalid";
    plugin.enabled = false;

    await t.step("no-op if plugin is disabled", () => {
      new PluginManager(cfg, testMap);
    });

    plugin.enabled = true;

    await t.step("throws if plugin is enabled", () => {
      assertThrows(
        () => new PluginManager(cfg, testMap),
        ErgomaticConfigError,
        "Unknown plugin ID",
      );
    });
  });

  await t.step("creates PluginManager instance", () => {
    new PluginManager(testConfig(), testMap);
  });
});

Deno.test("PluginManager", async (t) => {
  const cfg = testConfig();

  await t.step("start", async (t) => {
    await t.step("calls onStart once for managed plugins", async () => {
      const pluginManager = new PluginManager(cfg, testMap);
      const onStartSpy = spy(_pluginInternals, "onStart");

      try {
        await pluginManager.start();
        await pluginManager.start();
        assertEquals(onStartSpy.calls.length, 1);
      } finally {
        onStartSpy.restore();
      }
    });

    await t.step(
      "raises plugin:error event if managed plugin onStart throws",
      async () => {
        const pluginManager = new PluginManager(cfg, testMap);
        const onErrListener = () => {
          console.log("testttt");
        };
        const listenerSpy = spy(onErrListener);
        _pluginInternals.onStart = () => {
          console.log("hello");
          throw new Error("a");
        };
        // const onStartStub = stub(_pluginInternals, "onStart", () => {
        //   throw new Error();
        // });

        pluginManager.addEventListener("plugin:error", onErrListener);

        try {
          await pluginManager.start();
          assertEquals(listenerSpy.calls.length, 1);
        } finally {
          // onStartStub.restore();
        }
      },
    );
  });
});
