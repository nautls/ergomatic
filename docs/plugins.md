# Plugins

## Creating a Plugin

For this exercise lets assume I am creating a plugin for my dapp that requires off-chain bot functionality, my dapp is called "Degenz".

Firstly decide on a `id` for your plugin, this should be in `snake_case` format, in my case I will use `degenz`.

The easiest way to get started is to use the provided plugin template:

```
cp -r plugins/_template plugins/degenz
```

Next update the naming of various variables and classes to match your dapp, for example:

```
export const _TEMPLATE_PLUGIN_ID = "_template_plugin"; -> export const DEGENZ_PLUGIN_ID = "degenz";
interface _TemplatePluginConfig -> interface DegenzPluginConfig
class TemplatePlugin -> class DegenzPlugin
```

The template contains placeholder implementations for each plugin method, update these to implement your plugins logic as required.
`onStart` is where you should do any initialization logic such as starting of tasks, etc.
`onStop` is where any clean-up logic should be placed, destroying of tasks, persisting of any data, etc.

Finally register your plugin for usage by added it to `pluginConstructorMap` in `plugins/mod.ts` like so:

```ts

import { PluginConstructor } from "../src/plugins/plugin.ts";
import { EXAMPLE_PLUGIN_ID, ExamplePlugin } from "./example_plugin/mod.ts";
import { DEGENZ_PLUGIN_ID, DegenzPlugin } from "./degenz/mod.ts";

export const pluginConstructorMap: Record<string, PluginConstructor> = {
  [EXAMPLE_PLUGIN_ID]: ExamplePlugin,
  [DEGENZ_PLUGIN_ID]: DegenzPlugin,
};
```

Now you should be all set to add your plugin to your `ergomatic` configuration file. For example:

```toml
logLevel: INFO
plugins:
    - id: degenz
      enabled: true
      logLevel: DEBUG
      config:
        configValue: "testing"
        otherConfigValue: 5
```
