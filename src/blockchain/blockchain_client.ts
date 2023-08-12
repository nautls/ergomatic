import {
  AmountType,
  Box,
  TokenId,
  TransactionId,
  UnsignedTransaction,
} from "@fleet-sdk/common";

export interface BlockchainClient {
  submitTx(unsignedTx: UnsignedTransaction): Promise<TransactionId>;

  getBoxesByTokenId<T extends AmountType = string>(
    tokenId: TokenId,
  ): Promise<Box<T>[]>;
}
