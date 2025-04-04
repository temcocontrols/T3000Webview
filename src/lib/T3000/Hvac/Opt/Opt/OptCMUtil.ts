

import $ from 'jquery';
import CursorConstant from "../../Data/Constant/CursorConstant";
import NvConstant from '../../Data/Constant/NvConstant';
import OptConstant from "../../Data/Constant/OptConstant";
import T3Constant from "../../Data/Constant/T3Constant";
import StateConstant from "../../Data/State/StateConstant";
import T3Gv from '../../Data/T3Gv';
import Point from '../../Model/Point';
import '../../Util/T3Hammer';
import T3Util from "../../Util/T3Util";
import Utils2 from "../../Util/Utils2";
import DataUtil from "../Data/DataUtil";
import DSConstant from "../DS/DSConstant";
import UIUtil from "../UI/UIUtil";
import DrawUtil from "./DrawUtil";
import SelectUtil from "./SelectUtil";
import SvgUtil from "./SvgUtil";
import DSUtil from '../DS/DSUtil';

class OptCMUtil {

  /**
   * Determines the current type of content stored in the clipboard
   * This function checks various application states and clipboard contents
   * to determine what kind of data is currently available for pasting.
   *
   * @returns The identified clipboard content type (Text, LM, Table, or None)
   */
  static GetClipboardType() {
    T3Util.Log('O.Opt GetClipboardType - Input: No parameters');

    // Get the text edit session data
    const textEditData = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);

    // Initialize clipboard
    T3Gv.clipboard.Get();

    let clipboardType;

    // Check if text or note editing is currently active
    const isTextEditActive = textEditData.theActiveTextEditObjectID !== -1;
    const isNoteEditActive = T3Gv.opt.bInNoteEdit;

    if (isTextEditActive || isNoteEditActive) {
      // Determine clipboard type while in text/note editing mode
      if (T3Gv.opt.textClipboard && T3Gv.opt.textClipboard.text) {
        clipboardType = T3Constant.ClipboardType.Text;
      } else {
        clipboardType = T3Constant.ClipboardType.None;
      }
    }
    // Check for Layout Manager content in clipboard
    else if (T3Gv.opt.header.ClipboardBuffer &&
      T3Gv.opt.header.ClipboardType === T3Constant.ClipboardType.LM) {
      clipboardType = T3Constant.ClipboardType.LM;
    }
    // Check for text selection with available clipboard text
    else if (SelectUtil.GetTargetSelect() >= 0 &&
      T3Gv.opt.textClipboard &&
      T3Gv.opt.textClipboard.text) {
      clipboardType = T3Constant.ClipboardType.Text;
    }
    // Default: no valid clipboard content
    else {
      clipboardType = T3Constant.ClipboardType.None;
    }

    T3Util.Log('O.Opt GetClipboardType - Output:', clipboardType);
    return clipboardType;
  }

  /**
   * Converts pixel values to point values for font size calculations
   * This function is used when displaying font sizes that are stored in pixels but need to be shown in points.
   * The conversion uses the standard DPI relationship between pixels and points (72 points per inch).
   *
   * @param pixelValue - The font size in pixels to convert
   * @returns The equivalent font size in points, rounded to the nearest 0.5
   */
  static PixelstoPoints(pixelValue) {
    return Math.floor(100 * pixelValue / 72 + 0.5);
  }

  /**
  * Sets a flag on a link
  * @param targetId - ID of the target object
  * @param flagValue - Flag value to set
  * @returns 0 on success, 1 on failure
  */
  static SetLinkFlag(targetId, flagValue) {
    T3Util.Log("O.Opt SetLinkFlag - Input:", { targetId, flagValue });

    const links = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, false);

    if (links == null) {
      T3Util.Log("O.Opt SetLinkFlag - Output: 1 (links not found)");
      return 1;
    }

    // Find the link for the target object
    let linkIndex = this.FindLink(links, targetId, true);

    if (linkIndex >= 0) {
      // Get a preserved copy of the links for modification
      const preservedLinks = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, true);

      // Get the target object and ensure it exists
      const targetObject = DataUtil.GetObjectPtr(targetId, true);
      if (targetObject == null) {
        T3Util.Log("O.Opt SetLinkFlag - Output: 1 (target object not found)");
        return 1;
      }

      // Update the target object
      targetObject.ChangeTarget(targetId, null, null, null, null, false);

      // Set the flag for all links to this target
      while (linkIndex < preservedLinks.length && preservedLinks[linkIndex].targetid == targetId) {
        preservedLinks[linkIndex].flags = Utils2.SetFlag(preservedLinks[linkIndex].flags, flagValue, true);
        linkIndex++;
      }
    }

    T3Util.Log("O.Opt SetLinkFlag - Output: 0 (success)");
    return 0;
  }

  static FindLink(links, targetId, exactMatchOnly) {
    T3Util.Log("O.Opt FindLink - Input:", { links, targetId, exactMatchOnly });

    if (links.length === 0) {
      const result = exactMatchOnly ? -1 : 0;
      T3Util.Log("O.Opt FindLink - Output (empty links):", result);
      return result;
    }

    for (let index = 0; index < links.length; index++) {
      // If we find an exact match for the target ID
      if (links[index].targetid === targetId) {
        T3Util.Log("O.Opt FindLink - Output (exact match):", index);
        return index;
      }

      // If we're not requiring an exact match and found a target ID that's greater
      // than what we're looking for (used for sorted insertion)
      if (!exactMatchOnly && links[index].targetid > targetId) {
        T3Util.Log("O.Opt FindLink - Output (insertion point):", index);
        return index;
      }
    }

    // No match found - return appropriate value based on exactMatchOnly
    const result = exactMatchOnly ? -1 : links.length;
    T3Util.Log("O.Opt FindLink - Output (no match):", result);
    return result;
  }

  static SetEditMode(stateMode, cursorType?, shouldAddToList?, preserveExisting?) {
    T3Util.Log("O.Opt SetEditMode - Input:", { stateMode, cursorType, shouldAddToList, preserveExisting });

    let actualCursorType = cursorType;

    // Initialize edit mode list if needed
    if (T3Gv.opt.editModeList && (shouldAddToList || preserveExisting)) {
      // Keep existing list
    } else {
      T3Gv.opt.editModeList = [];
    }

    // Notify operation mng if available
    if (T3Gv.wallOpt && T3Gv.wallOpt.NotifySetEditMode) {
      T3Gv.wallOpt.NotifySetEditMode(stateMode);
    }

    // If no cursor type provided, determine it based on state mode
    if (!actualCursorType) {
      switch (stateMode) {
        case NvConstant.EditState.Stamp:
          actualCursorType = CursorConstant.CursorType.Stamp;
          break;
        case NvConstant.EditState.Text:
          actualCursorType = CursorConstant.CursorType.Text;
          break;
        case NvConstant.EditState.FormatPaint:
          actualCursorType = CursorConstant.CursorType.Paint;
          break;
        case NvConstant.EditState.LinkConnect:
          actualCursorType = CursorConstant.CursorType.Anchor;
          break;
        case NvConstant.EditState.LinkJoin:
          actualCursorType = CursorConstant.CursorType.EditClose;
          break;
        case NvConstant.EditState.Edit:
          actualCursorType = CursorConstant.CursorType.Edit;
          break;
        case NvConstant.EditState.DragControl:
          actualCursorType = CursorConstant.CursorType.NeswResize;
          break;
        case NvConstant.EditState.DragShape:
          actualCursorType = CursorConstant.CursorType.Move;
          break;
        case NvConstant.EditState.Grab:
          actualCursorType = CursorConstant.CursorType.Grab;
          break;
        default:
          actualCursorType = CursorConstant.CursorType.Default;
      }
    }

    // Set the cursor
    T3Gv.opt.svgDoc.SetCursor(actualCursorType);

    // Update edit mode list
    if (shouldAddToList || !T3Gv.opt.editModeList.length) {
      T3Gv.opt.editModeList.push({
        mode: stateMode,
        cursor: actualCursorType
      });
    } else {
      T3Gv.opt.editModeList[T3Gv.opt.editModeList.length - 1].mode = stateMode;
      T3Gv.opt.editModeList[T3Gv.opt.editModeList.length - 1].cursor = actualCursorType;
    }

    // Update cursors for highlighted shape
    if (T3Gv.opt.curHiliteShape >= 0) {
      const highlightedObject = T3Gv.stdObj.GetObject(T3Gv.opt.curHiliteShape);
      if (highlightedObject) {
        highlightedObject.Data.SetCursors();
      }
    }

    T3Util.Log("O.Opt SetEditMode - Output:", { mode: stateMode, cursor: actualCursorType });
  }

  static CancelOperation(): void {
    T3Util.Log("O.Opt CancelOperation - Input: crtOpt =", T3Gv.opt.crtOpt);
    switch (T3Gv.opt.crtOpt) {
      case OptConstant.OptTypes.None:
        break;
      case OptConstant.OptTypes.Stamp:
        DrawUtil.CancelObjectStamp(true);
        break;
      case OptConstant.OptTypes.StampTextOnTap:
        DrawUtil.CancelObjectStampTextOnTap(true);
        break;
      case OptConstant.OptTypes.DragDrop:
        DrawUtil.CancelObjectDragDrop(true);
        break;
      case OptConstant.OptTypes.Draw:
        DrawUtil.CancelObjectDraw();
        break;
      case OptConstant.OptTypes.FormatPainter:
        UIUtil.SetFormatPainter(true, false);
        break;
      case OptConstant.OptTypes.AddCorner:
        if (T3Gv.wallOpt && T3Gv.wallOpt.AddCorner) {
          this.ResetHammerGesture('dragstart', T3Gv.wallOpt.AddCorner, T3Gv.Evt_ShapeDragStart);
        }
        break;
    }
    T3Util.Log("O.Opt CancelOperation - Output: completed");
  }

  /**
   * Rebuilds URLs for objects in the current state manager, handling blob URLs for images and tables.
   * This function processes stored objects and ensures that blob URLs are properly created or deleted
   * based on the state operations (create or delete).
   *
   * @param stateId - The ID of the state to process
   * @param isNextState - If true, process the next state instead of current state
   * @returns void
   */
  static RebuildURLs(stateId: number, isNextState: boolean): void {
    T3Util.Log("O.Opt RebuildURLs - Input:", { stateId, isNextState });

    let storedObjectCount: number;
    let objectIndex: number;
    let storedObject: any;
    let objectInstance: any;
    let objectData: any;
    let blobBytes: any;
    let imageType: string;
    let tableObject: any;
    let tableData: any;
    let storedData: any;

    // If processing the next state, handle CREATE operations
    if (isNextState) {
      storedObjectCount = T3Gv.state.states[stateId + 1].storedObjects.length;

      for (objectIndex = 0; objectIndex < storedObjectCount; objectIndex++) {
        storedObject = T3Gv.state.states[stateId + 1].storedObjects[objectIndex];

        // Handle drawing objects with CREATE operations
        if (storedObject.Type === StateConstant.StoredObjectType.BaseDrawObject) {
          if (storedObject.stateOptTypeId === StateConstant.StateOperationType.CREATE) {
            objectData = storedObject.Data;

            if (this.IsBlobURL(objectData.ImageURL)) {
              objectInstance = T3Gv.stdObj.GetObject(storedObject.ID);

              if (objectInstance) {
                objectData = objectInstance.Data;
                blobBytes = objectData.GetBlobBytes();
                imageType = DSUtil.GetImageBlobType(blobBytes.ImageDir);
                objectData.ImageURL = DSUtil.MakeURL(null, blobBytes.Bytes, imageType);
              }
            }
          }
        }
      }
    }

    // Process current state objects
    storedObjectCount = T3Gv.state.states[stateId].storedObjects.length;

    for (objectIndex = 0; objectIndex < storedObjectCount; objectIndex++) {
      storedObject = T3Gv.state.states[stateId].storedObjects[objectIndex];

      // Handle drawing objects
      if (storedObject.Type === StateConstant.StoredObjectType.BaseDrawObject) {
        // Handle DELETE operations
        if (storedObject.stateOptTypeId === StateConstant.StateOperationType.DELETE) {
          if (!isNextState) {
            objectInstance = T3Gv.stdObj.GetObject(storedObject.ID);

            if (objectInstance) {
              objectData = objectInstance.Data;

              if (objectData.BlobBytesID >= 0 && this.IsBlobURL(objectData.ImageURL)) {
                blobBytes = objectData.GetBlobBytes();
                imageType = DSUtil.GetImageBlobType(blobBytes.ImageDir);
                objectData.ImageURL = DSUtil.MakeURL(null, blobBytes.Bytes, imageType);
              }
            }
          }
        }
        // Handle other operations
        else {
          storedData = storedObject.Data;
          objectInstance = T3Gv.stdObj.GetObject(storedObject.ID);

          if (this.IsBlobURL(storedData.ImageURL)) {
            if (objectInstance) {
              objectData = objectInstance.Data;

              if (storedData.ImageURL !== objectData.ImageURL) {
                this.DeleteURL(storedData.ImageURL);

                if (this.IsBlobURL(objectData.ImageURL)) {
                  blobBytes = objectData.GetBlobBytes();

                  if (blobBytes) {
                    imageType = DSUtil.GetImageBlobType(blobBytes.ImageDir);

                    if (this.IsBlobURL(objectData.ImageURL)) {
                      objectData.ImageURL = DSUtil.MakeURL(null, blobBytes.Bytes, imageType);
                    }
                  }
                }
              }
            } else {
              this.DeleteURL(storedData.ImageURL);
            }
          } else if (objectInstance) {
            objectData = objectInstance.Data;

            if (this.IsBlobURL(objectData.ImageURL)) {
              blobBytes = objectData.GetBlobBytes();

              if (blobBytes) {
                imageType = DSUtil.GetImageBlobType(blobBytes.ImageDir);

                if (this.IsBlobURL(objectData.ImageURL)) {
                  objectData.ImageURL = DSUtil.MakeURL(null, blobBytes.Bytes, imageType);
                }
              }
            }
          }
        }
      }
    }

    T3Util.Log("O.Opt RebuildURLs - Output: URLs rebuilt for state:", stateId);
  }

  /**
   * Checks if a URL is a blob URL
   * @param url - The URL to check
   * @returns True if the URL is a blob URL, false otherwise
   */
  static IsBlobURL(url) {
    T3Util.Log("O.Opt IsBlobURL - Input:", url);

    const isBlobUrl = !!(url && url.length > 0 && 'blob:' === url.substring(0, 5));

    T3Util.Log("O.Opt IsBlobURL - Output:", isBlobUrl);
    return isBlobUrl;
  }

  static ShapeToPolyLine(e, t, a, r) {
    var i,
      n,
      o,
      s,
      l = [],
      S = {};
    if (r) (i = r), (s = !0), (S = $.extend(!0, {}, i.Frame));
    else {
      null == (i = DataUtil.GetObjectPtr(e, !1)).polylist
        ? ((i.polylist = i.GetPolyList()), (i.StartPoint = {}), (i.EndPoint = {}))
        : (s = !0);
      var c = T3Gv.stdObj.PreserveBlock(e);
      if (null == c) return;
      (i = c.Data), (S = $.extend(!0, {}, i.Frame));
    }
    if (s) {
      if (!i.polylist) return null;
      if (
        (T3Gv.opt.GetClosedPolyDim(i),
          !SDJS.Utils.IsEqual(i.polylist.dim.x, S.width))
      ) {
        var u = Utils2.DeepCopy(i);
        (u.inside = $.extend(!0, {}, i.Frame)),
          SDJS.ListManager.PolyLine.prototype.ScaleObject.call(
            u,
            0,
            0,
            0,
            0,
            0,
            0
          ),
          (i.polylist = u.polylist);
      }
    }
    return (
      (o = i.polylist.segs.length),
      (i.StartPoint.x =
        i.Frame.x + i.polylist.segs[0].pt.x + i.polylist.offset.x),
      (i.StartPoint.y =
        i.Frame.y + i.polylist.segs[0].pt.y + i.polylist.offset.y),
      (i.EndPoint.x =
        i.Frame.x + i.polylist.segs[o - 1].pt.x + i.polylist.offset.x),
      (i.EndPoint.y =
        i.Frame.y + i.polylist.segs[o - 1].pt.y + i.polylist.offset.y),
      ((n = t
        ? new SDJS.ListManager.PolyLineContainer(i)
        : new SDJS.ListManager.PolyLine(i)).BlockID = i.BlockID),
      (n.polylist.Shape_Rotation = i.RotationAngle),
      (n.polylist.Shape_DataID = i.DataID),
      (n.RotationAngle = 0),
      (n.DataID = -1),
      r || (c.Data = n),
      a ||
      (DataUtil.AddToDirtyList(e),
        SvgUtil.RenderDirtySVGObjects(),
        l.push(e),
        SelectUtil.SelectObjects(l, !1, !0)),
      (n.inside = $.extend(!0, {}, i.Frame)),
      n
    );
  }

  static PutInFrontofObject(e, t) {
    var a,
      r = DataUtil.GetObjectPtr(this.theLayersManagerBlockID, !0),
      i = r.layers[r.activelayer].zList,
      n = i.indexOf(e),
      o = i.indexOf(t);
    if (n >= 0 && o >= 0)
      if (o < n) {
        for (a = o; a < n; a++)
          (i[a] = i[a + 1]), DataUtil.AddToDirtyList(i[a]);
        (i[n] = t), DataUtil.AddToDirtyList(t);
      } else {
        for (a = o; a > n + 1; a--)
          (i[a] = i[a - 1]), DataUtil.AddToDirtyList(i[a]);
        (i[n + 1] = t), DataUtil.AddToDirtyList(t);
      }
  }

  static InsertHops(e, t, a) {
    var r,
      i,
      n,
      o,
      s,
      l,
      S,
      c,
      u,
      p,
      d,
      D,
      g = e.hoplist.nhops,
      h = {},
      m = new Point(),
      C = new Point(),
      y = new Point(),
      f = new Point(),
      L = [],
      I = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, !1);
    for (D = I.hopdim.x, d = I.hopdim.y, r = g - 1; r >= 0; r--) if (!e.hoplist.hops[r].cons) {
      for (
        c = i = e.hoplist.hops[r].segment,
        s = r,
        p = r;
        s > 0 &&
        e.hoplist.hops[s - 1].cons;
      ) c = e.hoplist.hops[s - 1].segment,
        p = s - 1,
        s--;
      if (!(i < a)) return {
        bSuccess: !1,
        npts: a
      };
      if (a = (h = this.InsertPoints(t, a, i, 2)).npts, h.bSuccess) {
        if (
          t[i] = {
            x: e.hoplist.hops[p].pt.x,
            y: e.hoplist.hops[p].pt.y
          },
          t[i + 1] = {
            x: e.hoplist.hops[r].pt.x,
            y: e.hoplist.hops[r].pt.y
          },
          c < i
        ) {
          for (s = i; s < a; s++) t[c + s - i] = {
            x: t[s].x,
            y: t[s].y
          };
          a -= i - c
        }
        if (
          n = (i = c) + 1,
          o = u = c + 1,
          u = (h = this.PolyTrimForArrow(t, 0, u, D, D, m, C, !1)).npts,
          m = h.spt,
          C = h.ept,
          u < o
        ) {
          for (s = o; s < a; s++) t[u + s - o] = {
            x: t[s].x,
            y: t[s].y
          };
          a -= o - u,
            n -= o - u
        }
        if (
          y = {
            x: m.x,
            y: m.y
          },
          o = l = a - n,
          l = (h = this.PolyTrimForArrow(t, n, l, D, D, m, C, !0)).npts,
          m = h.spt,
          l < o &&
          (a -= o - l),
          f = {
            x: (C = h.ept).x,
            y: C.y
          },
          L = (h = this.BuildHop(I.hopstyle, d, y, f, S)).pts,
          S = h.npts,
          a = (h = this.InsertPoints(t, a, u, S)).npts,
          h.bSuccess
        ) for (s = 0; s < S; s++) t[u + s] = {
          x: L[s].x,
          y: L[s].y
        }
      }
    }
    return {
      bSuccess: !0,
      npts: a
    }
  }

  static PolyTrimForArrow(e, t, a, r, i, n, o, s) {
    var l = new Point()
      , S = {}
      , c = {};
    return l = (S = this.PolyFindLength(e, t, a, i, s, !1, l)).findpt,
      a = S.npts,
      s ? (c.spt = {
        x: e[t].x,
        y: e[t].y
      },
        c.ept = {
          x: l.x,
          y: l.y
        }) : (c.ept = {
          x: e[t + a - 1].x,
          y: e[t + a - 1].y
        },
          c.spt = {
            x: l.x,
            y: l.y
          }),
      l = (S = this.PolyFindLength(e, t, a, r, s, !0, l)).findpt,
      a = S.npts,
      c.pts = S.pts,
      c.npts = a,
      c
  }

  static InsertPoints(e, t, a, r) {
    var i;
    if (t + r > SDJS.ListManager.Defines.SED_MaxPoints)
      return {
        bSuccess: !1,
        npts: t
      };
    for (i = 0; i < r; ++i) {
      var n = new SDJS.ListManager.Point;
      e.push(n)
    }
    for (i = t - 1; i >= a; i--)
      e[i + r] = {
        x: e[i].x,
        y: e[i].y
      };
    for (t += r,
      i = a; i < a + r; i++)
      e[i] = {
        x: i - a,
        y: i - a
      };
    return {
      bSuccess: !0,
      npts: t
    }
  }

  static GetEditMode() {
    T3Util.Log('O.Opt GetEditMode - Input');

    const editModeList = T3Gv.opt.editModeList || [];
    let currentEditMode = NvConstant.EditState.Default;

    if (editModeList.length) {
      currentEditMode = editModeList[editModeList.length - 1].mode;
    }

    T3Util.Log('O.Opt GetEditMode - Output:', currentEditMode);
    return currentEditMode;
  }

  /**
   * Revokes a blob URL to free browser resources
   * This function releases the reference to a blob URL that was previously created
   * with URL.createObjectURL(). This helps prevent memory leaks when blob URLs
   * are no longer needed.
   *
   * @param url - The blob URL to revoke
   * @returns void
   */
  static DeleteURL(url) {
    const urlAPI = window.URL || window.webkitURL;
    if (urlAPI && urlAPI.revokeObjectURL) {
      urlAPI.revokeObjectURL(url);
    }
  }
}

export default OptCMUtil
