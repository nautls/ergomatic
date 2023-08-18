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
    const limit = 100; // highest value supported by node

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
