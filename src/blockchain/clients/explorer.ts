import {
  AmountType,
  Box,
  SignedTransaction,
  TokenId,
  TransactionId,
} from "@fleet-sdk/common";
import axios, { AxiosInstance } from "axios";
import { BlockchainClient } from "../blockchain_client.ts";
import { ErgomaticConfig } from "../../config.ts";

export class ExplorerClient implements BlockchainClient {
  readonly #http: AxiosInstance;
  #pageSize = 100;

  constructor(config: ErgomaticConfig) {
    this.#http = axios.create({
      // let URL handle any possible trailing slash,etc in the configured endpoint.
      baseURL: new URL("/api/v1", config.explorer.endpoint).href,
      timeout: 10000, // explorer API can be slow
    });
  }

  async submitTx(signedTx: SignedTransaction): Promise<TransactionId> {
    const response = await this.#http.post(
      "/mempool/transactions/submit",
      signedTx,
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
      });

      if (totalItems === null) {
        totalItems = data.total;
      }

      const items = data.items;

      if (items.length > 0) {
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
