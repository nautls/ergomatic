import { z } from "zod";
import merge from "lodash.merge";

const pluginConfigEntrySchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  config: z.object({}).optional(),
});

export type PluginConfigEntry = z.infer<typeof pluginConfigEntrySchema>;

const ergomaticConfigSchema = z.object({
  logLevel: z.enum(["NOTSET", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]),
  node: z.object({
    endpoint: z.string().url(),
  }),
  explorer: z.object({
    endpoint: z.string().url(),
  }),
  /** Optional for now until there's a usable indexer deployed. */
  indexer: z.object({
    endpoint: z.string().url(),
  }).optional(),
  plugins: z.array(pluginConfigEntrySchema).min(1),
});

export type ErgomaticConfig = z.infer<typeof ergomaticConfigSchema>;

const partialErgomaticConfigSchema = ergomaticConfigSchema.partial();

export type PartialErgomaticConfig = z.infer<
  typeof partialErgomaticConfigSchema
>;

/** Defaults to mainnet configuration values. */
const DEFAULT_ERGOMATIC_CONFIG: PartialErgomaticConfig = {
  logLevel: "INFO",
  node: {
    /**
     * Bootstrap mainnet node taken from:
     * https://github.com/ergoplatform/ergo/blob/3561825f6faed1778f8b1b415d29db0b95c4ea46/src/main/resources/mainnet.conf#L119C8-L119C28
     */
    endpoint: "http://213.239.193.208:9053",
  },
  explorer: {
    endpoint: "https://api.ergoplatform.com",
  },
};

/**
 * Merges the user supplied config with ergomatic's default config and validates.
 *
 * @throws {ZodError} If the config is invalid.
 * @returns Validated and merged config.
 */
export function mergeUserConfigAndValidate(
  userConfig: PartialErgomaticConfig,
): ErgomaticConfig {
  const mergedConfig = merge(DEFAULT_ERGOMATIC_CONFIG, userConfig);
  ergomaticConfigSchema.parse(mergedConfig);

  return mergedConfig as ErgomaticConfig;
}
