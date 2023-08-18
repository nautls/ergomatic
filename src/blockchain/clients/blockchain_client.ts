import {
  AmountType,
  Box,
  SignedTransaction,
  TokenId,
  TransactionId,
} from "@fleet-sdk/common";
import { Component } from "../../component.ts";
import { ErgomaticConfig } from "../../config.ts";
import { ExplorerClient } from "./explorer.ts";
import { NodeClient } from "./node.ts";

export interface BlockchainClient {
  submitTx(signedTx: SignedTransaction): Promise<TransactionId>;

  getBoxesByTokenId<T extends AmountType = string>(
    tokenId: TokenId,
  ): AsyncGenerator<Box<T>[]>;

  getMempool(): AsyncGenerator<SignedTransaction[]>;

  getCurrentHeight(): Promise<number>;

  getBlock(height: number): Promise<unknown>;
}

export class DefaultBlockchainClient extends Component
  implements BlockchainClient {
  readonly #explorer: BlockchainClient;
  readonly #node: BlockchainClient;

  constructor(config: ErgomaticConfig) {
    super(config, "DefaultBlockchainProvider");

    this.#explorer = new ExplorerClient(config);
    this.#node = new NodeClient(config);
  }

  getBlock(height: number): Promise<unknown> {
    return this.#node.getBlock(height);
  }

  getCurrentHeight(): Promise<number> {
    return this.#node.getCurrentHeight();
  }

  getMempool(): AsyncGenerator<SignedTransaction[]> {
    return this.#node.getMempool();
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
