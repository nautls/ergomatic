import {
  AmountType,
  Box,
  TokenId,
  TransactionId,
  UnsignedTransaction,
} from "@fleet-sdk/common";
import { Component } from "../component.ts";
import { ErgomaticConfig } from "../config.ts";
import { BlockchainClient } from "./blockchain_client.ts";
import { ExplorerClient, NodeClient } from "./clients/mod.ts";

export class BlockchainProvider extends Component implements BlockchainClient {
  readonly #explorer: BlockchainClient;
  readonly #node: BlockchainClient;

  constructor(config: ErgomaticConfig) {
    super(config, "BlockchainProvider");

    this.#explorer = new ExplorerClient(config);
    this.#node = new NodeClient(config);
  }

  submitTx(unsignedTx: UnsignedTransaction): Promise<TransactionId> {
    return this.#node.submitTx(unsignedTx);
  }

  getBoxesByTokenId<T extends AmountType = string>(
    tokenId: TokenId,
  ): Promise<Box<T>[]> {
    return this.#explorer.getBoxesByTokenId(tokenId);
  }
}
