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

  getBlock(height: number): Promise<unknown> {
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

  getMempool(): Promise<SignedTransaction[]> {
    // TODO: this might need pagination
    return this.#http.get(
      "/transactions/unconfirmed",
      this.#defaultRequestConfig,
    );
  }

  get #defaultRequestConfig() {
    return { signal: AbortSignal.timeout(this.#timeoutMs) };
  }
}
