import { assertEquals } from "std/testing/asserts.ts";
import { assertSpyCalls, spy } from "std/testing/mock.ts";
import { beforeEach, describe, it } from "std/testing/bdd.ts";
import { ErgomaticConfig } from "../config.ts";
import {
  BlockchainMonitor,
  BlockchainSnapshot,
  MonitorState,
} from "./blockchain_monitor.ts";
import { BlockchainClient, DefaultBlockchainClient } from "./mod.ts";
import { testConfig } from "../_testing.ts";
import { Block, SignedTransaction } from "@fleet-sdk/common";

function mkSnapshot(
  partial?: Partial<BlockchainSnapshot>,
): Readonly<BlockchainSnapshot> {
  return {
    height: 800000,
    mempool: [],
    ...partial,
  };
}

function mkBlock(txns: SignedTransaction[] = []): Block {
  return {
    header: {
      id: "1",
    },
    blockTransactions: {
      transactions: txns,
    },
  } as Block;
}

function defaultMonitorState(): MonitorState {
  return {
    currentHeight: 0,
    mempoolTxState: {},
    pastMempoolTxIds: [],
    lastPeerMsgTimestamp: 0,
  };
}

describe("BlockchainMonitor", () => {
  let config: ErgomaticConfig;
  let blockchainClient: BlockchainClient;
  let blockchainMonitor: BlockchainMonitor;
  const MAX_DROP_CHECKS = 5;

  beforeEach(() => {
    config = testConfig();
    blockchainClient = new DefaultBlockchainClient(config);
    blockchainMonitor = new BlockchainMonitor(
      config,
      blockchainClient,
      500,
      MAX_DROP_CHECKS,
    );
  });

  describe("handleMempool()", () => {
    it("should raise mempool tx events once for new mempool transactions", () => {
      const tx = { id: "1337" } as SignedTransaction;
      const state = defaultMonitorState();
      const snapshot = mkSnapshot();
      const dispatchSpy = spy(blockchainMonitor, "dispatchEvent");

      try {
        blockchainMonitor.handleMempool([tx], state, snapshot);
        // ensure event is only raised once
        blockchainMonitor.handleMempool([tx], state, snapshot);

        assertSpyCalls(dispatchSpy, 1);
        const [{ type, detail }] = dispatchSpy.calls[0].args as [CustomEvent];

        assertEquals(type, "monitor:mempool-tx");
        assertEquals(detail[0], tx);
        assertEquals(detail[1], snapshot);
      } finally {
        dispatchSpy.restore();
      }
    });
  });

  describe("checkForMempoolDrops()", () => {
    it("should raise mempool tx dropped event if drop check threshold exceeded", () => {
      const droppedTx = { id: "1337" } as SignedTransaction;
      const validTx = { id: "1338" } as SignedTransaction;
      const state = defaultMonitorState();
      const snapshot = mkSnapshot();
      const dispatchSpy = spy(blockchainMonitor, "dispatchEvent");

      state.mempoolTxState[droppedTx.id] = {
        delivered: true,
        dropChecks: MAX_DROP_CHECKS + 1,
        tx: droppedTx,
      };

      state.mempoolTxState[validTx.id] = {
        delivered: true,
        dropChecks: 0,
        tx: validTx,
      };

      try {
        blockchainMonitor.checkMempoolDrops(state, snapshot);

        // assert the event was raised once and only for tx exceeding check limit
        assertSpyCalls(dispatchSpy, 1);
        const [{ type, detail }] = dispatchSpy.calls[0].args as [CustomEvent];

        assertEquals(type, "monitor:mempool-tx-drop");
        assertEquals(detail[0], droppedTx);
        assertEquals(detail[1], snapshot);

        assertEquals(state.mempoolTxState[validTx.id].dropChecks, 1);
      } finally {
        dispatchSpy.restore();
      }
    });
  });

  describe("handleNewBlock()", () => {
    it("should raise new block event", () => {
      const block = mkBlock();
      const state = defaultMonitorState();
      const snapshot = mkSnapshot();
      const dispatchSpy = spy(blockchainMonitor, "dispatchEvent");

      try {
        blockchainMonitor.handleNewBlock(block, state, snapshot);

        assertSpyCalls(dispatchSpy, 1);
        const [{ type, detail }] = dispatchSpy.calls[0].args as [CustomEvent];

        assertEquals(type, "monitor:new-block");
        assertEquals(detail[0], block);
        assertEquals(detail[1], snapshot);
      } finally {
        dispatchSpy.restore();
      }
    });

    it("should raise new tx event for all transactions in block", () => {
      const tx = { id: "1337" } as SignedTransaction;
      const tx2 = { id: "1338" } as SignedTransaction;
      const block = mkBlock([tx, tx2]);
      const state = defaultMonitorState();
      const snapshot = mkSnapshot();
      const dispatchSpy = spy(blockchainMonitor, "dispatchEvent");

      state.mempoolTxState[tx.id] = {
        delivered: true,
        dropChecks: 0,
        tx,
      };

      state.mempoolTxState[tx2.id] = {
        delivered: true,
        dropChecks: 0,
        tx: tx2,
      };

      try {
        blockchainMonitor.handleNewBlock(block, state, snapshot);

        let { type, detail } = (dispatchSpy.calls[1].args as [CustomEvent])[0];

        assertEquals(type, "monitor:included-tx");
        assertEquals(detail[0], tx);
        assertEquals(detail[1], snapshot);

        type = (dispatchSpy.calls[2].args as [CustomEvent])[0].type;
        detail = (dispatchSpy.calls[2].args as [CustomEvent])[0].detail;

        assertEquals(type, "monitor:included-tx");
        assertEquals(detail[0], tx2);
        assertEquals(detail[1], snapshot);

        // ensure its removed from mempool tx dropped tracking
        assertEquals(state.mempoolTxState[tx.id], undefined);
        assertEquals(state.mempoolTxState[tx2.id], undefined);
      } finally {
        dispatchSpy.restore();
      }
    });
  });
});
