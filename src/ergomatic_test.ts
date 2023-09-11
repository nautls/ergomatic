import { beforeEach, describe, it } from "std/testing/bdd.ts";
import { Ergomatic } from "./ergomatic.ts";
import { PluginManager } from "./plugins/mod.ts";
import { ErgomaticConfig } from "./config.ts";
import { assertSpyCalls, spy, stub } from "std/testing/mock.ts";
import { assertEquals } from "std/testing/asserts.ts";
import { testConfig } from "./_testing.ts";
import { mkTestPluginManager } from "./plugins/_testing.ts";

describe("Ergomatic", () => {
  let config: ErgomaticConfig;
  let pluginManager: PluginManager;

  beforeEach(() => {
    config = testConfig();
    pluginManager = mkTestPluginManager({ config }).pluginManager;
  });

  describe("start()", () => {
    it("should call start() for each component", async () => {
      const pluginManagerSpy = spy(pluginManager, "start");
      const ergomatic = new Ergomatic({ config, pluginManager });

      try {
        await ergomatic.start();
        assertSpyCalls(pluginManagerSpy, 1);
      } finally {
        pluginManagerSpy.restore();
        await ergomatic.stop();
      }
    });
    it("should not call start() for components if already running", async () => {
      const pluginManagerSpy = spy(pluginManager, "start");
      const ergomatic = new Ergomatic({ config, pluginManager });

      try {
        await ergomatic.start();
        assertSpyCalls(pluginManagerSpy, 1);
        await ergomatic.start();
        assertSpyCalls(pluginManagerSpy, 1);
      } finally {
        pluginManagerSpy.restore();
        await ergomatic.stop();
      }
    });
    it("should raise an error event if a component throws an error", async () => {
      const ergomatic = new Ergomatic({ config, pluginManager });
      const err = new Error();
      const methodStub = stub(pluginManager, "start", () => {
        throw err;
      });
      const dispatchSpy = spy(ergomatic, "dispatchEvent");

      try {
        await ergomatic.start();

        assertSpyCalls(dispatchSpy, 1);

        const [{ type, detail }] = dispatchSpy.calls[0].args as [CustomEvent];

        assertEquals(type, "component:error");
        assertEquals(detail.error, err);
        assertEquals(detail.component, pluginManager);
      } finally {
        methodStub.restore();
        dispatchSpy.restore();
        await ergomatic.stop();
      }
    });
  });

  describe("stop()", () => {
    it("should call stop() for each component", async () => {
      const pluginManagerSpy = spy(pluginManager, "stop");
      const ergomatic = new Ergomatic({ config, pluginManager });

      try {
        await ergomatic.start();
        await ergomatic.stop();
        assertSpyCalls(pluginManagerSpy, 1);
      } finally {
        pluginManagerSpy.restore();
      }
    });
    it("should not call stop() for components if not already running", async () => {
      const pluginManagerSpy = spy(pluginManager, "stop");
      const ergomatic = new Ergomatic({ config, pluginManager });

      try {
        await ergomatic.stop();
        assertSpyCalls(pluginManagerSpy, 0);
      } finally {
        pluginManagerSpy.restore();
      }
    });
    it("should raise an error event if a component throws an error", async () => {
      const ergomatic = new Ergomatic({ config, pluginManager });
      const err = new Error();
      const methodStub = stub(pluginManager, "stop", () => {
        throw err;
      });
      const dispatchSpy = spy(ergomatic, "dispatchEvent");

      try {
        await ergomatic.start();

        assertSpyCalls(dispatchSpy, 0);

        await ergomatic.stop();

        assertSpyCalls(dispatchSpy, 1);

        const [{ type, detail }] = dispatchSpy.calls[0].args as [CustomEvent];

        assertEquals(type, "component:error");
        assertEquals(detail.error, err);
        assertEquals(detail.component, pluginManager);
      } finally {
        methodStub.restore();
        dispatchSpy.restore();
      }
    });
  });
});
