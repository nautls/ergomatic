import {
  AmountType,
  Box,
  TokenId,
  TransactionId,
  UnsignedTransaction,
} from "@fleet-sdk/common";
import { Component } from "../component.ts";
import { ErgomaticConfig } from "../config.ts";

export interface BlockchainProvider {
  submitTx(unsignedTx: UnsignedTransaction): Promise<TransactionId>;

  getBoxByTokenId<T extends AmountType = string>(
    tokenId: TokenId,
  ): Promise<Box<T>>;
}

export class DefaultBlockchainProvider extends Component
  implements BlockchainProvider {
  constructor(config: ErgomaticConfig) {
    super(config, "BlockchainProvider");
  }

  async submitTx(unsignedTx: UnsignedTransaction): Promise<TransactionId> {
    // prefer node api
    // fallback to explorer api
    throw new Error("Method not implemented.");
  }

  async getBoxByTokenId<T extends AmountType = string>(
    tokenId: TokenId,
  ): Promise<Box<T>> {
    // call explorer api
    throw new Error("Method not implemented.");
  }
}
