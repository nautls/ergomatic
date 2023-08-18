import {
  AmountType,
  Box,
  SignedTransaction,
  TokenId,
  TransactionId,
} from "@fleet-sdk/common";
import { BlockchainClient } from "./blockchain_client.ts";
import { Component } from "../../component.ts";
import { ErgomaticConfig } from "../../config.ts";
import axios, { AxiosInstance } from "axios";

export class NodeClient extends Component implements BlockchainClient {
  readonly #http: AxiosInstance;
  #timeoutMs: number;

  constructor(config: ErgomaticConfig, httpTimeoutMs: number = 10000) {
    super(config, "NodeClient");

    this.#timeoutMs = httpTimeoutMs;
    this.#http = axios.create({
      baseURL: config.node.endpoint,
    });
  }

  getBlock(_height: number): Promise<unknown> {
    throw new Error("Method not implemented.");
  }

  getCurrentHeight(): Promise<number> {
    throw new Error("Method not implemented.");
  }

  submitTx(
    signedTx: SignedTransaction,
  ): Promise<TransactionId> {
    return this.#http.post(
      "/transactions",
      signedTx,
      this.#defaultRequestConfig,
    );
  }

  // deno-lint-ignore require-yield
  async *getBoxesByTokenId<T extends AmountType = string>(
    _tokenId: TokenId,
  ): AsyncGenerator<Box<T>[]> {
    throw new Error(
      `${this.name} does not support getBoxesByTokenId operation`,
    );
  }

  async *getMempool(): AsyncGenerator<SignedTransaction[]> {
    let offset = 0;
    // the max limit is defined as 100 in the node api spec but is not enforced
    // take advantage of this to reduce the number of requests
    // this function is still paginated with the expectation that this could
    // be changed in the future.
    const limit = 100000;

    while (true) {
      const { data } = await this.#http.get("/transactions/unconfirmed", {
        params: { offset, limit },
        ...this.#defaultRequestConfig,
      });

      if (data.length) {
        yield data;
      }

      if (data.length < limit) {
        break;
      }

      offset += limit;
    }
  }

  get #defaultRequestConfig() {
    return { signal: AbortSignal.timeout(this.#timeoutMs) };
  }
}
