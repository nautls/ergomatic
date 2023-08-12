import { AmountType, Box, UnsignedTransaction } from "@fleet-sdk/common";
import { BlockchainClient } from "../blockchain_client.ts";
import { ErgomaticConfig } from "../../config.ts";
import { ErgomaticUnsupportedError } from "../../error.ts";

export class NodeClient implements BlockchainClient {
  readonly #endpoint: string;

  constructor(config: ErgomaticConfig) {
    this.#endpoint = config.node.endpoint;
  }

  submitTx(unsignedTx: UnsignedTransaction): Promise<string> {
    throw new Error("Method not implemented.");
  }

  getBoxesByTokenId<T extends AmountType = string>(
    tokenId: string,
  ): Promise<Box<T>[]> {
    throw new ErgomaticUnsupportedError(
      "NodeClient does not support 'getBoxesByTokenId' operation",
    );
  }
}
