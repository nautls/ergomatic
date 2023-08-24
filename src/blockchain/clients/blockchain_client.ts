import {
  AmountType,
  Block,
  BlockHeaderId,
  Box,
  SignedTransaction,
  TokenId,
  TransactionId,
} from "@fleet-sdk/common";
import { Component } from "../../component.ts";
import { ErgomaticConfig } from "../../config.ts";
import { ExplorerClient } from "./explorer.ts";
import { NodeClient } from "./node.ts";

/**
 * RestrictedBlockchainClient is a blockchain client that is exclusively used by plugins.
 * The API is intentionally restricted to prevent plugins issuing excessive API requests
 * that are instead provided to plugins via a snapshot of the blockchain state.
 */
export interface RestrictedBlockchainClient {
  submitTx(signedTx: SignedTransaction): Promise<TransactionId>;

  getBoxesByTokenId<T extends AmountType = string>(
    tokenId: TokenId,
  ): AsyncGenerator<Box<T>[]>;
}

export interface BlockchainInfo {
  currentHeight: number;
  lastPeerMsgTimestamp?: number;
}

export interface BlockchainClient extends RestrictedBlockchainClient {
  getMempool(): AsyncGenerator<SignedTransaction[]>;

  getInfo(): Promise<BlockchainInfo>;

  getBlockIdsByHeight(height: number): Promise<BlockHeaderId[]>;

  getBlockById(id: BlockHeaderId): Promise<Block | undefined>;
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

  getBlockIdsByHeight(height: number): Promise<string[]> {
    return this.#node.getBlockIdsByHeight(height);
  }

  getBlockById(id: BlockHeaderId): Promise<Block | undefined> {
    return this.#node.getBlockById(id);
  }

  getInfo(): Promise<BlockchainInfo> {
    return this.#node.getInfo();
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
