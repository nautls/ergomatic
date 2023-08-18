import {
  AmountType,
  Box,
  SignedTransaction,
  TokenId,
  TransactionId,
} from "@fleet-sdk/common";
import { Component } from "../../component.ts";
import { ErgomaticConfig } from "../../config.ts";
import { BlockchainClient } from "./blockchain_client.ts";
import { ExplorerClient } from "./explorer.ts";
import { NodeClient } from "./node.ts";

/**
 * BlockchainProvider is a blockchain client that is exclusively used by plugins.
 * The API is intentionally restricted to prevent plugins issuing excessive API requests
 * that are instead provided to plugins via a snapshot of the blockchain state.
 */
export interface BlockchainProvider {
  submitTx(signedTx: SignedTransaction): Promise<TransactionId>;

  getBoxesByTokenId<T extends AmountType = string>(
    tokenId: TokenId,
  ): AsyncGenerator<Box<T>[]>;
}

export class DefaultBlockchainProvider extends Component
  implements BlockchainProvider {
  readonly #explorer: BlockchainClient;
  readonly #node: BlockchainClient;

  constructor(config: ErgomaticConfig) {
    super(config, "DefaultBlockchainProvider");

    this.#explorer = new ExplorerClient(config);
    this.#node = new NodeClient(config);
  }

  submitTx(signedTx: SignedTransaction): Promise<TransactionId> {
    return this.#node.submitTx(signedTx);
  }

  getBoxesByTokenId<T extends AmountType = string>(
    tokenId: TokenId,
  ): AsyncGenerator<Box<T>[]> {
    return this.#explorer.getBoxesByTokenId(tokenId);
  }
}
