import { AmountType, Box, UnsignedTransaction } from "@fleet-sdk/common";
import { BlockchainClient } from "../blockchain_client.ts";
import { ErgomaticConfig } from "../../config.ts";

export class ExplorerClient implements BlockchainClient {
  readonly #endpoint: string;

  constructor(config: ErgomaticConfig) {
    this.#endpoint = config.explorer.endpoint;
  }

  submitTx(unsignedTx: UnsignedTransaction): Promise<string> {
    throw new Error("Method not implemented.");
  }

  getBoxesByTokenId<T extends AmountType = string>(
    tokenId: string,
  ): Promise<Box<T>[]> {
    // call explorer api
    // https://api.ergoplatform.com/api/v1/docs/#operation/getApiV1BoxesBytokenidP1
    throw new Error("Method not implemented.");
  }
}
