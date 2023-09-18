import yargs from "yargs";
import * as yaml from "std/yaml/mod.ts";
import {
  mergeUserConfigAndValidate,
  PartialErgomaticConfig,
} from "./config.ts";
import version from "./version.ts";
import { Ergomatic } from "./ergomatic.ts";

let _ergomatic: Ergomatic | undefined;

interface RunArgs {
  /**
   * Path to the `ergomatic` config file.
   * Defaults to `ergomatic.yaml` in the current working directory.
   */
  config: string;
}

function getScriptName() {
  let name = "ergomatic";

  if (Deno.build.os === "windows") {
    name += ".exe";
  }

  return name;
}

/**
 * Reads the config file from the given path.
 * If the path does not exist, an empty object is returned.
 *
 * @throws {YAMLError} If the config file contains invalid YAML.
 */
async function getConfig(configPath: string) {
  try {
    const userCfgStr = await Deno.readTextFile(configPath);

    return yaml.parse(userCfgStr);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      console.log(`Config file not found: '${configPath}'`);
      console.log("Default configuration will be used");

      return {};
    } else {
      throw e;
    }
  }
}

async function runHandler({ config }: RunArgs) {
  const userConfig = await getConfig(config) as PartialErgomaticConfig;
  const ergomaticConfig = mergeUserConfigAndValidate(userConfig);

  _ergomatic = new Ergomatic({ config: ergomaticConfig });

  // TODO: more robust handling
  _ergomatic.addEventListener("plugin:error", (e) => {
    console.error(`Plugin error: ${e.detail.plugin.descriptor.name}`);
    console.error(e.detail.error);
  });

  // TODO: more robust handling
  _ergomatic.addEventListener("component:error", (e) => {
    console.error(`Component error: ${e.detail.component.name}`);
    console.error(e.detail.error);
  });

  _ergomatic.start();
}

async function onExit() {
  if (_ergomatic?.isRunning) {
    await _ergomatic.stop();
  }
}

globalThis.addEventListener("unload", onExit);
Deno.addSignalListener("SIGINT", onExit);

/**
 * Setting `scriptName` is required to show correct CLI name in `yargs` output.
 * Without it `yargs` shows the app name as `deno`.
 */
yargs(Deno.args)
  .scriptName(getScriptName())
  .command(
    "run",
    "Start running ergomatic",
    // deno-lint-ignore no-explicit-any
    function (yargs: any) {
      return yargs.option("config", {
        alias: "c",
        default: "ergomatic.yaml",
        describe: "Path to your ergomatic configuration file.",
      });
    },
    runHandler,
  )
  .version(`ergomatic ${version} (${Deno.build.target})`)
  .parse();
