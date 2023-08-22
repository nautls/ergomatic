import { SignedTransaction, TransactionId } from "@fleet-sdk/common";
import { Component } from "../component.ts";
import { ErgomaticConfig } from "../config.ts";
import { BlockchainClient } from "./clients/mod.ts";

export interface BlockchainSnapshot {
  height: number;
  mempool: SignedTransaction[];
}

interface MonitorState {
  currentHeight: number;
  /** map of txid -> bool indicating if mempool tx has been passed to plugins */
  mempoolTxDelivery: Record<TransactionId, boolean>;
  /** map of txid -> int indicating the number of re-checks */
  mempoolTxChecks: Record<TransactionId, number>;
  pastMempoolTxIds: TransactionId[];
  lastPeerMsgTimestamp: number;
}

type MonitorEvent<T> = CustomEvent<[T, Readonly<BlockchainSnapshot>]>;

interface BlockchainMonitorEvent {
  "monitor:mempool-tx": MonitorEvent<SignedTransaction>;
  "monitor:mempool-tx-drop": MonitorEvent<SignedTransaction>;
  "monitor:included-tx": MonitorEvent<SignedTransaction>;
  "monitor:new-block": MonitorEvent<unknown>;
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
      mempoolTxDelivery: {},
      mempoolTxChecks: {},
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

    for (const tx of mempool) {
      if (!this.#state.mempoolTxDelivery[tx.id]) {
        this.#state.mempoolTxDelivery[tx.id] = true;

        this.dispatchEvent(
          new CustomEvent("monitor:mempool-tx", { detail: [tx, snapshot] }),
        );
      }

      this.#state.pastMempoolTxIds = this.#state.pastMempoolTxIds.filter((
        txId,
      ) => txId !== tx.id);

      // remove txid from undefined state transactions map if present
      // this resets the mempool drop detection counter for this txid
      delete this.#state.mempoolTxChecks[tx.id];
    }

    // if tx was present in previous mempool, but not in the
    // current, it may have been dropped or included in a block
    for (const txId of this.#state.pastMempoolTxIds) {
      this.#state.mempoolTxChecks[txId] =
        (this.#state.mempoolTxChecks[txId] ?? 0) + 1;
    }

    this.#state.pastMempoolTxIds = mempool.map((tx) => tx.id);

    if (currentHeight > this.#state.currentHeight) {
      const newBlock = await this.#blockchainClient.getBlock(
        currentHeight,
      ) as any;

      this.dispatchEvent(
        new CustomEvent("monitor:new-block", { detail: [newBlock, snapshot] }),
      );

      this.#state.currentHeight = currentHeight;

      for (const tx of newBlock.blockTransactions) {
        this.dispatchEvent(
          new CustomEvent("monitor:included-tx", { detail: [tx, snapshot] }),
        );

        // stop tracking mempool delivery for this txid
        delete this.#state.mempoolTxDelivery[tx.id];

        // prevent `onMempoolTxDrop` event for this txid as
        // it is now included in a block
        delete this.#state.mempoolTxChecks[tx.id];
      }
    }

    for (const txId of Object.keys(this.#state.mempoolTxChecks)) {
      // if a tx is not included in a block in dropChecks * `n` seconds,
      // then it's probably dropped from the mempool
      if (this.#state.mempoolTxChecks[txId] > this.#maxMempoolTxChecks) {
        // TODO raise mempool dropped, so we still need to keep track of txns not just the id?
        delete this.#state.mempoolTxChecks[txId];
      } else {
        this.#state.mempoolTxChecks[txId] += 1;
      }
    }
  }
}
