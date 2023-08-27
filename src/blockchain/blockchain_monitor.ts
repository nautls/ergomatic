import { Block, SignedTransaction, TransactionId } from "@fleet-sdk/common";
import { Component } from "../component.ts";
import { ErgomaticConfig } from "../config.ts";
import { BlockchainClient } from "./clients/mod.ts";

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

interface MonitorState {
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
    maxMempoolTxChecks: number = 10,
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
    // TODO: raise component:error event if monitor throws exception
    this.#taskHandle = setInterval(() => this.#monitor(), this.#pollIntervalMs);

    return super.start();
  }

  stop(): Promise<void> {
    clearInterval(this.#taskHandle);

    return super.stop();
  }

  async #monitor() {
    this.logger.debug("Gathering blockchain state");

    const { currentHeight, lastPeerMsgTimestamp } = await this.#blockchainClient
      .getInfo();

    if (lastPeerMsgTimestamp === this.#state.lastPeerMsgTimestamp) {
      return;
    }

    this.#state.lastPeerMsgTimestamp = lastPeerMsgTimestamp!;

    const mempool = [];
    // the loop following this where we go through all the mempool txs could
    // go in here as well but each time the `monitor:mempool-tx` event is raised
    // it could provide a different mempool snapshot to plugins.
    //
    // instead, collect the full mempool first so the plugins can receive a full consistent snapshot.
    for await (const page of this.#blockchainClient.getMempool()) {
      mempool.push(...page);
    }

    const snapshot: Readonly<BlockchainSnapshot> = Object.freeze({
      height: currentHeight,
      mempool,
    });

    const { mempoolTxState } = this.#state;

    for (const tx of mempool) {
      if (!mempoolTxState[tx.id]) {
        mempoolTxState[tx.id] = {
          delivered: false,
          dropChecks: 0,
          tx,
        };
      }

      if (!mempoolTxState[tx.id].delivered) {
        this.dispatchEvent(
          new CustomEvent("monitor:mempool-tx", { detail: [tx, snapshot] }),
        );

        mempoolTxState[tx.id].delivered = true;
      }

      this.#state.pastMempoolTxIds = this.#state.pastMempoolTxIds.filter((
        txId,
      ) => txId !== tx.id);

      mempoolTxState[tx.id].dropChecks = 0;
    }

    // if tx was present in previous mempool, but not in the
    // current, it may have been dropped or included in a block
    for (const txId of this.#state.pastMempoolTxIds) {
      mempoolTxState[txId].dropChecks += 1;
    }

    this.#state.pastMempoolTxIds = mempool.map((tx) => tx.id);

    if (currentHeight > this.#state.currentHeight) {
      this.#handleNewHeight(currentHeight, snapshot);

      this.#state.currentHeight = currentHeight;
    }

    for (const txState of Object.values(mempoolTxState)) {
      // if a tx is not included in a block in dropChecks * `n` seconds,
      // then it's probably dropped from the mempool
      if (txState.dropChecks > this.#maxMempoolTxChecks) {
        this.dispatchEvent(
          new CustomEvent("monitor:mempool-tx-drop", {
            detail: [txState.tx, snapshot],
          }),
        );
        delete mempoolTxState[txState.tx.id];
      } else {
        txState.dropChecks += 1;
      }
    }
  }

  async #handleNewHeight(
    height: number,
    currentSnapshot: Readonly<BlockchainSnapshot>,
  ): Promise<void> {
    const blockIds = await this.#blockchainClient.getBlockIdsByHeight(height);
    const blockPromises = blockIds.map((blockId) =>
      this.#blockchainClient.getBlockById(blockId)
    );
    const blocks = await Promise.all(blockPromises);

    for (const block of blocks) {
      if (!block) {
        continue;
      }

      this.dispatchEvent(
        new CustomEvent("monitor:new-block", {
          detail: [block, currentSnapshot],
        }),
      );

      for (const tx of Object.values(block.blockTransactions.transactions)) {
        this.dispatchEvent(
          new CustomEvent("monitor:included-tx", {
            detail: [tx, currentSnapshot],
          }),
        );

        // stop tracking delivery and drop checks for this txid
        delete this.#state.mempoolTxState[tx.id];
      }
    }
  }
}
