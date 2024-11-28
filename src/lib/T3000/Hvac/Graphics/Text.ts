import Formatter from "./Text.Formatter";
import Edit from "./Text.Edit";
import * as Utils from '../Hvac.Utils';
import HvacSVG from '../Hvac.SVG';
import Element from './Element';

enum CursorState {
  NONE = 0,
  EDITONLY = 1,
  EDITLINK = 2,
  LINKONLY = 3
}

class Text extends Element {

  public formatter: Formatter;
  public editor: Edit;
  public svgObj: any;
  public textElem: any;
  public selectElem: any;
  public cursorElem: any;
  public clickAreaElem: any;
  public decorationAreaElem: any;
  public cursorTimer: any;
  public cursorPos: any;
  public cursorState: any;
  public minHeight: number;
  public vAlign: string;
  public textElemOffset: number;
  public activeEditStyle: number;
  public selectHidden: boolean;
  public linksDisabled: boolean;
  public editCallback: any;
  public editCallbackData: any;
  public dataTableID: number;
  public dataRecordID: number;
  public dataStyleOverride: any;
  public lastFmtSize: any;

  constructor() {
    super();
  }

  CreateElement = function (e, t) {
    this.formatter = new Formatter(this);
    this.editor = new Edit(this);
    this.svgObj = new HvacSVG.Container(HvacSVG.create('g'));
    this.InitElement(e, t);
    this.textElem = new HvacSVG.Container(HvacSVG.create('text'));
    this.selectElem = new HvacSVG.Path();
    this.cursorElem = new HvacSVG.Line();
    this.clickAreaElem = new HvacSVG.Rect();
    this.decorationAreaElem = new HvacSVG.Container(HvacSVG.create('g'));
    this.cursorTimer = undefined;
    this.cursorPos = undefined;
    this.cursorState = CursorState.LINKONLY;
    this.clickAreaElem.attr('stroke-width', 0);
    this.clickAreaElem.attr('fill', 'none');
    this.clickAreaElem.attr('visibility', 'hidden');
    this.clickAreaElem.node.setAttribute('no-export', '1');
    this.selectElem.node.setAttribute('no-export', '1');
    this.cursorElem.node.setAttribute('no-export', '1');
    this.svgObj.add(this.clickAreaElem);
    this.svgObj.add(this.textElem);
    this.svgObj.add(this.decorationAreaElem);
    this.minHeight = 0;
    this.vAlign = 'top';
    // this.textElemOffset = 0;
    // this.activeEditStyle = -1;
    // this.selectHidden = false;
    // this.linksDisabled = false;
    // this.editCallback = null;
    // this.editCallbackData = null;
    // this.dataTableID = -1;
    // this.dataRecordID = -1;
    // this.dataStyleOverride = null;
    this.lastFmtSize = {
      width: 0,
      height: 0
    };
    // this.SetText('');
    return this.svgObj;
  }

  SetText = function (text, formatStyle, additionalParam, anotherParam, flag) {
    // const startPos = additionalParam || 0;
    // const textLength = text.length;

    // if (this.editor.IsActive()) {
    //   this.editor.ClearSelection();
    // }

    // if (!formatStyle && this.activeEditStyle >= 0) {
    //   formatStyle = this.activeEditStyle;
    // }

    // this.activeEditStyle = -1;
    this.formatter.SetText(text, formatStyle, additionalParam, anotherParam);
    this.UpdateTextObject();

    // if (this.editor.IsActive()) {
    //   if (flag) {
    //     this.editor.UpdateTextEntryField(false);
    //   }
    //   this.editor.SetInsertPos(startPos + textLength, null, flag);
    // }
  }

  IsActive = function () {
    return this.editor.IsActive()
  }

  CallEditCallback = function (e, t) {
    if (this.editCallback) return this.editCallback(e, t, this, this.editCallbackData)
  }

  SetFormat = function (e, t, a) {
    this.activeEditStyle = this.formatter.SetFormat(e, t, a),
      this.UpdateTextObject()
  }

  UpdateTextObject = function () {
    const textSize = this.formatter.GetTextFormatSize();
    let needsResize = false;
    let verticalOffset = 0;

    if (this.formatter.renderingEnabled) {
      const height = Math.max(textSize.height, this.minHeight);

      switch (this.vAlign) {
        case "top":
          verticalOffset = 0;
          break;
        case "middle":
          verticalOffset = (height - textSize.height) / 2;
          break;
        case "bottom":
          verticalOffset = height - textSize.height;
          break;
      }

      const newSize = { width: textSize.width, height: height };

      if (newSize.width !== this.lastFmtSize.width || newSize.height !== this.lastFmtSize.height) {
        this.CallEditCallback("willresize", newSize);
        needsResize = true;
      }

      this.svgObj.size(textSize.width, height);
      this.clickAreaElem.transform({ x: 0, y: 0 });
      this.clickAreaElem.size(textSize.width, height);
      this.textElem.size(textSize.width, textSize.height);
      this.textElem.transform({ x: 0, y: verticalOffset });
      this.decorationAreaElem.size(textSize.width, textSize.height);
      this.decorationAreaElem.transform({ x: 0, y: verticalOffset });

      this.textElemOffset = verticalOffset;
      this.geometryBBox.width = textSize.width;
      this.geometryBBox.height = height;

      this.RefreshPaint();
      this.formatter.RenderFormattedText(this.textElem, this.decorationAreaElem);

      // if (!this.linksDisabled && (this.cursorState === CursorState.EDITLINK || this.cursorState === CursorState.LINKONLY)) {
      //   this.formatter.SetHyperlinkCursor();
      // }

      // if (this.editor.IsActive()) {
      //   if (this.editor.cursorPos >= 0) {
      //     this.editor.UpdateCursor();
      //   } else if (this.editor.selStart >= 0) {
      //     this.editor.UpdateSelection();
      //   }
      // }

      if (needsResize) {
        this.CallEditCallback("didresize", newSize);
      }

      this.lastFmtSize = newSize;
    }
  }
}

export default Text;
