import { TransactionId } from "@fleet-sdk/common";
import { Component } from "../component.ts";
import { ErgomaticConfig } from "../config.ts";
import { BlockchainClient, BlockchainProvider } from "./clients/mod.ts";

interface MonitorState {
  currentHeight: number;
  mempoolTxDelivery: Record<TransactionId, boolean>;
  mempoolTxChecks: Record<TransactionId, number>;
  maxMempoolTxChecks: number;
  pastMempoolTxIds: TransactionId[];
}

export class BlockchainMonitor extends Component {
  readonly #blockchainClient: BlockchainClient;
  readonly #pollInterval: number;
  readonly #state: MonitorState;
  #taskHandle?: number;

  constructor(
    config: ErgomaticConfig,
    blockchainClient?: BlockchainClient,
    pollInterval: number = 10000,
  ) {
    super(config, "BlockchainMonitor");

    this.#pollInterval = pollInterval;
    this.#blockchainClient = blockchainClient ?? new BlockchainProvider(config);
    this.#state = {
      currentHeight: 0,
      mempoolTxDelivery: {},
      mempoolTxChecks: {},
      maxMempoolTxChecks: 10,
      pastMempoolTxIds: [],
    };
  }

  start(): Promise<void> {
    // TODO: raise component:error event if monitor throws exception
    this.#taskHandle = setInterval(() => this.#monitor(), this.#pollInterval);

    return super.start();
  }

  stop(): Promise<void> {
    clearInterval(this.#taskHandle);

    return super.stop();
  }

  async #monitor() {
    this.logger.debug("Gathering blockchain state");

    //     mempool = getMempool()
    // for tx in mempool
    // do
    //     if mempoolDelivery[tx.txid] == false
    //     do
    //         plugins.all.onMempoolTx(tx)
    //         mempoolDelivery[tx.txid] = true
    //     end

    //     pastMempool.removeIfExists(tx.txid)

    //     # remove txid from undefined state transactions map,
    //     # if present
    //     delete undefinedStateCheks[tx.txid]
    // end
    const mempool = await this.#blockchainClient.getMempool();

    for (const tx of mempool) {
      if (!this.#state.mempoolTxDelivery[tx.id]) {
        this.#state.mempoolTxDelivery[tx.id] = true;

        // TODO: emit onMempoolTx event
      }

      //     pastMempool.removeIfExists(tx.txid)

      //     # remove txid from undefined state transactions map,
      //     # if present
      //     delete undefinedStateCheks[tx.txid]
    }

    // # if tx was present in previous mempool, but not in the
    // # current, it may have been dropped or included in a block
    // for txid in pastMempool
    // do
    //     undefinedStateCheks[txid] = (undefinedStateCheks[txid] ?? 0) + 1
    // end
    // pastMempool = mempool.map(tx => tx.txid);

    // height = getCurrentHeight()
    // if height > currentHeight
    // do
    //     newBlock = getBlock(height)
    //     plugins.all.onNewBlock(newBlock)

    //     currentHeight = height

    //     for tx in newBlock.txs
    //     do
    //         plugins.all.onIncludedTx(tx)

    //         # stop tracking txid mempool delivery for this txid
    //         delete mempoolDelivery[tx.txid]

    //         # prevent `onMempoolTxDrop` event for this txid as
    //         # it is now included in a block
    //         delete undefinedStateCheks[tx.txid]
    //     end
    // end

    // for txid in undefinedStateCheks.keys
    // do
    //     # if a tx is not included in a block in dropChecks * `n` seconds,
    //     # then it's probably dropped from the mempool
    //     if undefinedStateCheks[txid] > maxChecks
    //     do # consider dropped
    //         plugins.all.onMempoolTxDrop(txid)
    //         delete undefinedStateCheks[txid]
    //     else # one more inconclusive check
    //         undefinedStateCheks[txid] += 1
    //     end
    // end
  }
}
