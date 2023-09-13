import { Block, SignedTransaction, TransactionId } from "@fleet-sdk/common";
import { Component } from "../component.ts";
import { ErgomaticConfig } from "../config.ts";
import { BlockchainClient } from "./clients/mod.ts";
import { isAxiosError } from "axios";

export interface BlockchainSnapshot {
  height: number;
  mempool: SignedTransaction[];
}

interface MempoolTxState {
  /** indicates if mempool tx has been passed to plugins */
  delivered: boolean;
  /**
   * number of checks since the transaction appeared in mempool AND wasn't included in a block.
   * used to determine if a tx has been dropped from the mempool.
   */
  dropChecks: number;
  tx: SignedTransaction;
}

export interface MonitorState {
  currentHeight: number;
  mempoolTxState: Record<TransactionId, MempoolTxState>;
  pastMempoolTxIds: TransactionId[];
  lastPeerMsgTimestamp: number;
}

type MonitorEvent<T> = CustomEvent<[T, Readonly<BlockchainSnapshot>]>;

interface BlockchainMonitorEvent {
  "monitor:mempool-tx": MonitorEvent<SignedTransaction>;
  "monitor:mempool-tx-drop": MonitorEvent<SignedTransaction>;
  "monitor:included-tx": MonitorEvent<SignedTransaction>;
  "monitor:new-block": MonitorEvent<Block>;
}

export class BlockchainMonitor extends Component<BlockchainMonitorEvent> {
  readonly #blockchainClient: BlockchainClient;
  readonly #pollIntervalMs: number;
  readonly #maxMempoolTxChecks: number;
  readonly #state: MonitorState;
  #taskHandle?: number;

  constructor(
    config: ErgomaticConfig,
    blockchainClient: BlockchainClient,
    pollIntervalMs: number = 500,
    maxMempoolTxChecks: number = 50,
  ) {
    super(config, "BlockchainMonitor");

    this.#pollIntervalMs = pollIntervalMs;
    this.#maxMempoolTxChecks = maxMempoolTxChecks;
    this.#blockchainClient = blockchainClient;
    this.#state = {
      currentHeight: 0,
      mempoolTxState: {},
      pastMempoolTxIds: [],
      lastPeerMsgTimestamp: 0,
    };
  }

  start(): Promise<void> {
    // logging warning for exceptions for now, maybe add some more robust handling in the future like determining if the error is fatal or transient, etc
    this.#taskHandle = setInterval(
      () =>
        this.#monitor().catch((e) =>
          this.logger.warning(
            `exception was thrown: ${
              this.#formatErrorText(e)
            }\ncontinuing execution`,
          )
        ),
      this.#pollIntervalMs,
    );

    return super.start();
  }

  stop(): Promise<void> {
    this.logger.debug("stopping monitoring task");
    clearInterval(this.#taskHandle);

    return super.stop();
  }

  async #monitor() {
    this.logger.debug("Gathering blockchain state");

    const { fullHeight, lastSeenMessageTime } = await this.#blockchainClient
      .getInfo();

    this.logger.debug(
      `height: ${fullHeight}, last peer msg: ${lastSeenMessageTime}`,
    );

    if (lastSeenMessageTime === this.#state.lastPeerMsgTimestamp) {
      this.logger.debug("no peer message since last poll");

      return;
    }

    this.#state.lastPeerMsgTimestamp = lastSeenMessageTime!;

    const mempool = [];
    // the loop following this where we go through all the mempool txs could
    // go in here as well but each time the `monitor:mempool-tx` event is raised
    // it could provide a different mempool snapshot to plugins.
    //
    // instead, collect the full mempool first so the plugins can receive a full consistent snapshot.
    for await (const page of this.#blockchainClient.getMempool()) {
      mempool.push(...page);
    }

    this.logger.debug(`${mempool.length} transactions in mempool`);

    const snapshot: Readonly<BlockchainSnapshot> = Object.freeze({
      height: fullHeight,
      mempool,
    });

    this.handleMempool(mempool, this.#state, snapshot);

    if (fullHeight > this.#state.currentHeight) {
      await this.handleNewHeight(fullHeight, this.#state, snapshot);
    }

    this.checkMempoolDrops(this.#state, snapshot);
  }

  handleMempool(
    mempool: SignedTransaction[],
    state: MonitorState,
    currentSnapshot: Readonly<BlockchainSnapshot>,
  ) {
    this.logger.debug("handleMempool()");

    const { mempoolTxState } = state;

    for (const tx of mempool) {
      this.logger.debug(`managing tx in mempool with id: ${tx.id}`);

      if (!mempoolTxState[tx.id]) {
        this.logger.debug(`${tx.id} not in mempool state, adding..`);

        mempoolTxState[tx.id] = {
          delivered: false,
          dropChecks: 0,
          tx,
        };
      }

      if (!mempoolTxState[tx.id].delivered) {
        this.logger.debug(`delivering mempool tx ${tx.id} to plugins`);

        this.dispatchEvent(
          new CustomEvent("monitor:mempool-tx", {
            detail: [tx, currentSnapshot],
          }),
        );

        mempoolTxState[tx.id].delivered = true;
      }

      state.pastMempoolTxIds = state.pastMempoolTxIds.filter((
        txId,
      ) => txId !== tx.id);

      this.logger.debug(`setting drop checks for ${tx.id} to 0`);

      mempoolTxState[tx.id].dropChecks = 0;
    }

    // increment drop checks for all txns in a previous mempool
    // if the txn was in a previous mempool and also in the current
    // mempool then the drop checks should have been reset to 0
    // before this point
    for (const txId of state.pastMempoolTxIds) {
      mempoolTxState[txId].dropChecks += 1;

      this.logger.debug(
        `incremented drop checks for tx ${txId} to ${
          mempoolTxState[txId].dropChecks
        }`,
      );
    }

    state.pastMempoolTxIds = mempool.map((tx) => tx.id);
  }

  checkMempoolDrops(
    state: MonitorState,
    currentSnapshot: Readonly<BlockchainSnapshot>,
  ) {
    this.logger.debug("checkForMempoolDrops()");

    for (const txState of Object.values(state.mempoolTxState)) {
      const txId = txState.tx.id;

      // if a tx is not included in a block in dropChecks * `n` seconds,
      // then it's probably dropped from the mempool
      if (txState.dropChecks > this.#maxMempoolTxChecks) {
        this.logger.info(
          `transaction dropped from mempool ${txId}, drop checks: ${txState.dropChecks} > max(${this.#maxMempoolTxChecks})`,
        );

        this.dispatchEvent(
          new CustomEvent("monitor:mempool-tx-drop", {
            detail: [txState.tx, currentSnapshot],
          }),
        );
        delete state.mempoolTxState[txId];
      } else {
        txState.dropChecks += 1;

        this.logger.debug(
          `incremented drop checks for tx ${txId} to ${
            state.mempoolTxState[txId].dropChecks
          }`,
        );
      }
    }
  }

  async handleNewHeight(
    height: number,
    state: MonitorState,
    currentSnapshot: Readonly<BlockchainSnapshot>,
  ): Promise<void> {
    this.logger.debug(
      `handling new height: ${height} > ${state.currentHeight}`,
    );

    const blockIds = await this.#blockchainClient.getBlockIdsByHeight(height);

    this.logger.debug(`new block ids: ${blockIds.join(",")}, fetching blocks`);

    const blockPromises = blockIds.map((blockId) =>
      this.#blockchainClient.getBlockById(blockId)
    );
    const blocks = await Promise.all(blockPromises);

    this.logger.debug(`processing ${blocks.length} new blocks`);

    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i];

      if (!block) {
        this.logger.warning(
          `failed to retrieve a block with id: ${
            blockIds[i]
          }, it might be skipped!`,
        );

        continue;
      }

      this.handleNewBlock(block, state, currentSnapshot);
    }

    state.currentHeight = height;
  }

  handleNewBlock(
    block: Block,
    state: MonitorState,
    currentSnapshot: Readonly<BlockchainSnapshot>,
  ) {
    this.dispatchEvent(
      new CustomEvent("monitor:new-block", {
        detail: [block, currentSnapshot],
      }),
    );

    this.logger.debug(
      `block ${block.header.id} has ${block.blockTransactions.transactions.length} transactions`,
    );

    for (const tx of Object.values(block.blockTransactions.transactions)) {
      this.dispatchEvent(
        new CustomEvent("monitor:included-tx", {
          detail: [tx, currentSnapshot],
        }),
      );

      // stop tracking delivery and drop checks for this txid
      delete state.mempoolTxState[tx.id];
      this.logger.debug(
        `mempool tx removed from state tracking as it was included in block: ${tx.id}`,
      );
    }
  }

  #formatErrorText(e: Error): string {
    let text = e.message;

    if (isAxiosError(e) && e.response) {
      const baseUrl = e.response.config!.baseURL ?? "";
      const url = `${baseUrl}${e.response.config!.url!}`;

      text += `\n request endpoint: ${url}`;
      text += `\n response body: ${JSON.stringify(e.response.data)}`;
    }

    return text;
  }
}
