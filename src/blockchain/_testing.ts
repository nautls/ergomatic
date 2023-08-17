import { ErgomaticConfig } from "../config.ts";
import { BlockchainMonitor } from "./blockchain_monitor.ts";
import { BlockchainClient } from "./clients/mod.ts";

export function mkTestBlockchainMonitor(
  config: ErgomaticConfig,
  blockchainClient: BlockchainClient,
) {
  return new BlockchainMonitor(config, blockchainClient);
}
