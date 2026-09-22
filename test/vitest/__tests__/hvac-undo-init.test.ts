import { beforeEach, describe, expect, it } from "vitest";

import ReactT3Gv from "../../../src/lib/t3-hvac/Data/T3Gv";
import ReactDataStore from "../../../src/lib/t3-hvac/Data/State/DataStore";
import ReactStateOpt from "../../../src/lib/t3-hvac/Data/State/StateOpt";
import ReactState from "../../../src/lib/t3-hvac/Data/State/State";

import VueT3Gv from "../../../src/lib/vue/T3000/Hvac/Data/T3Gv";
import VueDataStore from "../../../src/lib/vue/T3000/Hvac/Data/State/DataStore";
import VueStateOpt from "../../../src/lib/vue/T3000/Hvac/Data/State/StateOpt";
import VueState from "../../../src/lib/vue/T3000/Hvac/Data/State/State";

/**
 * Undo history as the engine leaves it after a document has been loaded.
 *
 * The engine builds and loads a document with undo recording switched off and then settles the ring
 * (`T3Opt.InitializeDocument` -> `StateOpt.FinalizeLoadedHistory`). These tests pin the two properties
 * the rest of the editor relies on:
 *
 *  - a document nobody has touched has nothing to undo, and
 *  - the user's **first** edit after a load is one state, undoable back to the loaded document.
 *
 * The second one used to fail: the load left its state open, so the first edit merged into index 0,
 * and `ToolActUtil.Undo` refuses to go below index 0.
 *
 * Both engine copies are covered on purpose: `src/lib/vue/T3000/Hvac/**` is the legacy Vue app's copy of
 * this engine and carried the identical defect, so the same assertions are what keep the two in step.
 */
const engines: Array<{ name: string; T3Gv: any; DataStore: any; StateOpt: any; State: any }> = [
  {
    name: "t3-hvac (React designer)",
    T3Gv: ReactT3Gv,
    DataStore: ReactDataStore,
    StateOpt: ReactStateOpt,
    State: ReactState,
  },
  {
    name: "vue/T3000/Hvac (legacy Vue app)",
    T3Gv: VueT3Gv,
    DataStore: VueDataStore,
    StateOpt: VueStateOpt,
    State: VueState,
  },
];

describe.each(engines)("HVAC undo history at engine init — $name", (engine) => {
  const { T3Gv, DataStore, StateOpt, State } = engine;

  /** Writes a block the way `DataStore.SaveObject` does per object — through the state funnel. */
  function writeObject(): number {
    const block: any = { ID: -1, Type: 1, Data: { BlockID: -1 } };
    return T3Gv.stdObj.SaveObject(block);
  }

  beforeEach(() => {
    T3Gv.state = new StateOpt();
    T3Gv.stdObj = new DataStore();
    T3Gv.currentObjSeqId = 0;
    // The real option manager needs the whole engine; only `noUndo` is read by the state funnel.
    T3Gv.opt = { noUndo: false };
  });

  it("leaves a virgin document with nothing to undo", () => {
    T3Gv.state.FinalizeLoadedHistory();

    expect(T3Gv.state.states).toHaveLength(1);
    expect(T3Gv.state.currentStateId).toBe(0);
    expect(T3Gv.state.states[0].IsOpen).toBe(false);
    expect(T3Gv.state.GetUndoState()).toEqual({ undo: false, redo: false });
  });

  it("makes the first edit after a load one state, undoable back to the loaded document", () => {
    T3Gv.state.FinalizeLoadedHistory();

    const firstId = writeObject();
    const secondId = writeObject();

    // One state for the whole edit, not one per stored-object write.
    expect(T3Gv.state.currentStateId).toBe(1);
    expect(T3Gv.state.states).toHaveLength(2);
    expect(T3Gv.state.states[1].storedObjects.map((stored) => stored.ID)).toEqual([
      firstId,
      secondId,
    ]);
    expect(T3Gv.state.GetUndoState().undo).toBe(true);
  });

  it("does not swallow the first edit into an open baseline (the defect this fixes)", () => {
    T3Gv.state.FinalizeLoadedHistory();

    // What the load produced before this change: the baseline state left open.
    T3Gv.state.states[0].IsOpen = true;
    writeObject();

    expect(T3Gv.state.currentStateId).toBe(0);
    expect(T3Gv.state.GetUndoState().undo).toBe(false);
  });

  it("keeps a history restored from storage, closing only its current state", () => {
    // What `DataOpt.InitState` restores: [baseline, edit] with the edit still open as it was saved.
    const baseline = new State(0, "T3");
    baseline.IsOpen = false;
    const edit = new State(1, "T3");
    T3Gv.state.states = [baseline, edit];
    T3Gv.state.currentStateId = 1;

    T3Gv.state.FinalizeLoadedHistory();

    expect(T3Gv.state.states).toHaveLength(2);
    expect(T3Gv.state.currentStateId).toBe(1);
    expect(edit.IsOpen).toBe(false);

    // The next edit therefore starts its own state instead of merging into the restored one.
    writeObject();
    expect(T3Gv.state.currentStateId).toBe(2);
    expect(T3Gv.state.GetUndoState().undo).toBe(true);
  });

  it("records nothing while undo recording is switched off, but still stores the object", () => {
    T3Gv.state.FinalizeLoadedHistory();

    T3Gv.opt.noUndo = true;
    const objectId = writeObject();
    T3Gv.opt.noUndo = false;

    expect(T3Gv.stdObj.GetObject(objectId)).not.toBeNull();
    expect(T3Gv.state.states).toHaveLength(1);
    expect(T3Gv.state.currentStateId).toBe(0);
  });

  it("tolerates a write before the option manager exists", () => {
    T3Gv.opt = undefined;

    expect(() => writeObject()).not.toThrow();
  });
});
