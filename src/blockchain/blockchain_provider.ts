import {
  AmountType,
  Box,
  SignedTransaction,
  TokenId,
  TransactionId,
} from "@fleet-sdk/common";
import { Component } from "../component.ts";
import { ErgomaticConfig } from "../config.ts";
import { BlockchainClient } from "./blockchain_client.ts";
import { ExplorerClient } from "./clients/mod.ts";

export class BlockchainProvider extends Component implements BlockchainClient {
  readonly #explorer: BlockchainClient;

  constructor(config: ErgomaticConfig) {
    super(config, "BlockchainProvider");

    this.#explorer = new ExplorerClient(config);
  }

  submitTx(signedTx: SignedTransaction): Promise<TransactionId> {
    return this.#explorer.submitTx(signedTx);
  }

  getBoxesByTokenId<T extends AmountType = string>(
    tokenId: TokenId,
  ): AsyncGenerator<Box<T>[]> {
    return this.#explorer.getBoxesByTokenId(tokenId);
  }
}
