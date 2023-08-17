import {
  AmountType,
  Box,
  SignedTransaction,
  TokenId,
  TransactionId,
} from "@fleet-sdk/common";

export interface BlockchainClient {
  submitTx(signedTx: SignedTransaction): Promise<TransactionId>;

  getBoxesByTokenId<T extends AmountType = string>(
    tokenId: TokenId,
  ): AsyncGenerator<Box<T>[]>;

  getMempool(): Promise<SignedTransaction[]>;

  getCurrentHeight(): Promise<number>;

  getBlock(height: number): Promise<unknown>;
}
