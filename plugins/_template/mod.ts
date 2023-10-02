import { Plugin, PluginDescriptor } from "../../src/plugins/mod.ts";
import { z } from "zod/mod.ts";

export const _TEMPLATE_PLUGIN_ID = "_template_plugin";

interface _TemplatePluginConfig {
  tokenId: string;
  exitAtPage: number;
}

export class _TemplatePlugin extends Plugin<_TemplatePluginConfig> {
  get descriptor(): PluginDescriptor {
    return {
      // Human readable name of your plugin
      name: "Template Plugin",
      // Description of your plugins functionality and anything else users should be aware of
      description:
        "This is an example plugin showcasing how to create & implement ergomatic plugins.",
      // Version of your plugin
      version: "0.1.0",
    };
  }

  onStart(): Promise<void> {
    return Promise.resolve();
  }

  // deno-lint-ignore no-explicit-any
  configSchema(): z.ZodObject<any> | undefined {
    return z.object({
      tokenId: z.string(),
      exitAtPage: z.number(),
    });
  }
}
