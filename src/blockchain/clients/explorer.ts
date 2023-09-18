import {
  AmountType,
  Block,
  BlockHeaderId,
  Box,
  SignedTransaction,
  TokenId,
  TransactionId,
} from "@fleet-sdk/common";
import axios, { AxiosInstance } from "axios";
import { BlockchainClient, BlockchainInfo } from "./blockchain_client.ts";
import { ErgomaticConfig } from "../../config.ts";
import { Component } from "../../component.ts";
import { ERGOMATIC_USER_AGENT } from "../../http.ts";

export class ExplorerClient extends Component implements BlockchainClient {
  readonly #http: AxiosInstance;
  #pageSize = 100;
  #timeoutMs: number;

  constructor(config: ErgomaticConfig, httpTimeoutMs: number = 10000) {
    super(config, "ExplorerClient");

    // axios timeout is incompatible with deno due to a missing nodejs API
    // use signals for timeouts instead.
    this.#timeoutMs = httpTimeoutMs;
    this.#http = axios.create({
      // let URL handle any possible trailing slash,etc in the configured endpoint.
      baseURL: new URL("/api/v1", config.explorer.endpoint).href,
      headers: {
        "User-Agent": ERGOMATIC_USER_AGENT,
      },
    });
  }

  getBlockIdsByHeight(_height: number): Promise<BlockHeaderId[]> {
    throw new Error("Method not implemented.");
  }

  getBlockById(_id: BlockHeaderId): Promise<Block | undefined> {
    throw new Error("Method not implemented.");
  }

  getInfo(): Promise<BlockchainInfo> {
    throw new Error("Method not implemented.");
  }

  getMempool(): AsyncGenerator<SignedTransaction[]> {
    throw new Error(`${this.name} does not support getMempool operation`);
  }

  async submitTx(signedTx: SignedTransaction): Promise<TransactionId> {
    const response = await this.#http.post(
      "/mempool/transactions/submit",
      signedTx,
      {
        signal: AbortSignal.timeout(this.#timeoutMs),
      },
    );

    return response.data;
  }

  async *getBoxesByTokenId<T extends AmountType = string>(
    tokenId: TokenId,
  ): AsyncGenerator<Box<T>[]> {
    // explorer pagination is awkward
    let totalItems = null;
    let fetchedItems = 0;
    let offset = 0;

    while (true) {
      const { data } = await this.#http.get(`/boxes/byTokenId/${tokenId}`, {
        params: { offset, limit: this.#pageSize },
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
      const { total, items } = data;

      if (totalItems === null) {
        totalItems = total;
      }

      if (items.length) {
        yield items;
      }

      fetchedItems += items.length;
      offset += this.#pageSize;

      if (fetchedItems === totalItems) {
        break;
      }
    }
  }
}
