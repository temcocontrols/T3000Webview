import * as Utils from '../Helper/Helper.Utils';
import T3Svg from '../Helper/T3Svg';

class Formatter {
  public parent: any;
  public limits: any;
  public fmtText: any;
  public rtData: any;
  public renderedLines: any[];
  public wordList: any;
  public renderingEnabled: boolean;
  public deferredRenderNeeded: boolean;
  public contentVersion: number;
  public spellCheckEnabled: boolean;
  public dataNameEnabled: boolean;

  constructor(e: any) {
    this.parent = e;
    this.limits = { minWidth: 0, maxWidth: 0 };
    this.fmtText = this.DefaultFmtText();
    this.rtData = this.DefaultRuntimeText();
    this.renderedLines = [];
    this.wordList = null;
    this.renderingEnabled = true;
    this.deferredRenderNeeded = false;
    this.contentVersion = 0;
    this.spellCheckEnabled = false;
    this.dataNameEnabled = false;
  }

  DefaultFmtText = function () {
    return { width: 0, height: 0, fmtWidth: 0, text: '', paragraphs: [], styles: [], hyperlinks: [] }
  }

  DefaultPStyle = function () {
    return { just: 'left', bullet: 'none', spacing: 0, pindent: 0, lindent: 0, rindent: 0, tabspace: 0 }
  }

  DefaultRuntimeText = function () {
    return { text: '', charStyles: [], styleRuns: [], styles: [this.DefaultStyle()], hyperlinks: [] }
  }

  DefaultStyle = function () {
    return {
      font: 'Arial', type: 'sanserif', size: 10, weight: 'normal', style: 'normal', baseOffset: 'none',
      decoration: 'none', color: '#000', colorTrans: 1, spError: false, dataField: null, hyperlink: - 1
    }
  }

  SetText = function (text, format, start, length, callback) {

    console.log('SetText', text, format, start, length, callback);

    let formatId, endFormatId, newText, beforeText, afterText, paragraphCount, paragraphIndex, paragraphStyle, newParagraphs = [], isNewFormat = false, defaultParagraphStyle = this.DefaultPStyle();

    text = String(text).replace(/(\r\n|\r|\u2028|\u2029)/g, '\n').replace(/([\u0000-\u0008]|[\u000B-\u001F])/g, '');
    start = start == null ? 0 : Math.max(0, Math.min(start, this.rtData.text.length));
    length = length == null ? this.rtData.text.length - start : Math.min(length, this.rtData.text.length - start);

    if (typeof format === 'number') {
      formatId = format;
    } else if (!this.rtData.text.length || start >= this.rtData.text.length - 1) {
      formatId = Math.max(this.rtData.styles.length - 1, 0);
      isNewFormat = true;
    } else if (length > 0) {
      formatId = this.GetFormatAtOffset(start).id;
      endFormatId = this.GetFormatAtOffset(start + length).id;
    } else {
      formatId = this.GetFormatAtOffset(start - 1).id;
      endFormatId = this.GetFormatAtOffset(start).id;
    }

    if (start === 0) isNewFormat = true;
    if (endFormatId < 0) endFormatId = formatId;

    paragraphCount = this.GetTextParagraphCount(text);
    paragraphIndex = this.GetParagraphAtOffset(start);
    if (paragraphIndex >= 0) defaultParagraphStyle = this.rtData.styleRuns[paragraphIndex].pStyle;

    for (let i = 0; i < paragraphCount; i++) {
      newParagraphs.push({ pStyle: Utils.CopyObj(defaultParagraphStyle) });
    }

    if (start === this.rtData.text.length) {
      newText = this.rtData.text + text;
    } else {
      beforeText = start > 0 ? this.rtData.text.slice(0, start) : '';
      afterText = start + length < this.rtData.text.length ? this.rtData.text.slice(start + length) : '';
      newText = beforeText + text + afterText;
    }

    if (!callback || this.parent.CallEditCallback('onbeforeinsert', newText) !== false) {
      this.rtData.text = newText;
      this.contentVersion++;

      let wasRenderingEnabled = this.renderingEnabled;
      if (wasRenderingEnabled) this.SetRenderingEnabled(false);
      this.BuildRuntimeRuns(this.rtData, newParagraphs);
      if (wasRenderingEnabled) this.SetRenderingEnabled(true);
    }
  }

  GetTextParagraphCount = function (text: string): number {
    const matches = text.match(/\n/g);
    let count = 1;
    if (matches) {
      count += matches.length;
    }
    return count;
  }

  GetParagraphAtOffset = function (offset) {
    for (let i = 0; i < this.rtData.styleRuns.length; i++) {
      if (offset < this.rtData.styleRuns[i].start + this.rtData.styleRuns[i].nChars) {
        return i;
      }
    }
    return this.rtData.styleRuns.length - 1;
  }

  SetRenderingEnabled = function (enabled: boolean) {
    this.renderingEnabled = enabled;
    if (enabled && this.deferredRenderNeeded) {
      const newParagraphs = this.rtData.styleRuns.map(run => ({
        pStyle: Utils.CopyObj(run.pStyle)
      }));
      this.BuildRuntimeRuns(this.rtData, newParagraphs);
      this.fmtText = this.CalcFromRuntime(this.rtData, this.limits);
      this.deferredRenderNeeded = false;
    }
  }

  BuildRuntimeRuns = function (rtData, paragraphs) {
    let paragraphStartIndices = [0];
    let defaultParagraphStyle = this.DefaultPStyle();
    let textLength = rtData.text.length;

    // Collect start indices of paragraphs
    for (let i = 0; i < textLength; i++) {
      if (rtData.text[i] === '\n') {
        paragraphStartIndices.push(i + 1);
      }
    }

    rtData.styleRuns = [];
    rtData.spErrors = [];
    rtData.dataFields = [];

    if (this.parent.doc) {
      for (let i = 0; i < paragraphStartIndices.length; i++) {
        let start = paragraphStartIndices[i];
        let length = (i < paragraphStartIndices.length - 1) ? paragraphStartIndices[i + 1] - start : textLength - start;
        let paragraphStyle = (rtData.styleRuns.length < paragraphs.length) ? paragraphs[rtData.styleRuns.length].pStyle : defaultParagraphStyle;
        let styleRun = {
          pStyle: Utils.CopyObj(paragraphStyle),
          runs: [],
          start: start,
          nChars: length
        };

        if (this.renderingEnabled) {
          if (length > 0) {
            let currentFormat = null;
            let spellError = null;
            let dataField = null;

            for (let j = start; j < start + length; j++) {
              let format = this.GetFormatAtOffset(j, rtData);

              if (currentFormat) {
                styleRun.runs[styleRun.runs.length - 1].nChars++;
              } else {
                let run = {
                  style: format.id,
                  start: j,
                  nChars: 1,
                  metrics: this.parent.doc.CalcStyleMetrics(format.style)
                };
                styleRun.runs.push(run);
              }

              currentFormat = format;

              if (format.style.spError) {
                if (spellError) {
                  spellError.nChars++;
                } else {
                  spellError = { startIndex: j, nChars: 1 };
                  rtData.spErrors.push(spellError);
                }
              } else {
                spellError = null;
              }

              if (format.style.dataField) {
                if (dataField && dataField.fieldID === format.style.dataField) {
                  dataField.nChars++;
                } else {
                  dataField = { fieldID: format.style.dataField, startIndex: j, nChars: 1 };
                  rtData.dataFields.push(dataField);
                }
              } else {
                dataField = null;
              }
            }
          } else {
            let format = this.GetFormatAtOffset(start, rtData);
            let run = {
              style: format.id,
              start: start,
              nChars: 0,
              metrics: this.parent.doc.CalcStyleMetrics(format.style)
            };
            styleRun.runs.push(run);
          }
        } else {
          this.deferredRenderNeeded = true;
        }

        rtData.styleRuns.push(styleRun);
      }
    }
  }

  SpellCheckValid = function () {
    return this.spellCheckEnabled &&
      this.parent.doc.spellChecker &&
      this.parent.doc.spellChecker.GetActive() &&
      this.parent.IsActive();
  }

  GetFormatAtOffset = function (offset: number, rtData = this.rtData) {
    let formatId = 0;
    let style = this.DefaultStyle();

    if (offset >= rtData.charStyles.length) {
      offset = rtData.charStyles.length - 1;
    }

    if (offset < 0) {
      offset = 0;
    }

    if (offset < rtData.charStyles.length) {
      formatId = rtData.charStyles[offset];
      if (formatId < rtData.styles.length) {
        style = rtData.styles[formatId];
      }
    } else if (rtData.styles.length > 0) {
      formatId = rtData.styles.length - 1;
      style = rtData.styles[formatId];
    }

    return {
      id: formatId,
      style: style
    };
  }

  static CalcStyleMetrics(style, doc) {
    let textContainer = new T3Svg.Container(T3Svg.create('text'));
    textContainer.attr('xml:space', 'preserve');
    textContainer.attr('text-anchor', 'start');

    let textRunElem = Formatter.CreateTextRunElem(' .', style, doc, false, null);
    textContainer.add(textRunElem);
    textContainer.attr('fill-opacity', 0);

    let formattingLayer = doc.GetFormattingLayer();
    formattingLayer.svgObj.add(textContainer);

    let charExtent = textContainer.node.getExtentOfChar(0);
    formattingLayer.svgObj.remove(textContainer);

    let metrics = {
      height: charExtent.height,
      width: charExtent.width,
      ascent: -charExtent.y,
      descent: charExtent.height + charExtent.y,
      extraYOffset: 0
    };

    if (style) {
      let isSubscript = style.baseOffset === 'sub';
      let isSuperscript = style.baseOffset === 'super';

      if (isSubscript || isSuperscript) {
        let baseStyle = Utils.CopyObj(style);
        baseStyle.baseOffset = undefined;
        let baseMetrics = doc.CalcStyleMetrics(baseStyle);

        if (isSuperscript) {
          let offset = baseMetrics.ascent / 2;
          let totalHeight = offset + metrics.ascent + baseMetrics.descent;
          if (totalHeight > baseMetrics.height) {
            baseMetrics.height = totalHeight;
          }
          metrics.height = baseMetrics.height;
          metrics.ascent = baseMetrics.height - baseMetrics.descent;
          metrics.descent = baseMetrics.descent;
          metrics.extraYOffset = -offset;
        } else {
          let offset = metrics.ascent / 2;
          if (baseMetrics.descent < metrics.descent + offset) {
            baseMetrics.descent = metrics.descent + offset;
          }
          metrics.height = baseMetrics.ascent + baseMetrics.descent;
          metrics.ascent = baseMetrics.ascent;
          metrics.descent = baseMetrics.descent;
          metrics.extraYOffset = offset;
        }
      }
    }

    return metrics;
  }

  static MakeIDFromStyle(style) {
    return (style.font + '_' + style.size + '_' + style.weight + '_' + style.style + '_' + style.baseOffset).replace(/ /g, '');
  }

  static CreateTextRunElem(text, style, doc, linksDisabled, dataStyleOverride) {
    const tspan = new T3Svg.Container(T3Svg.create('tspan'));
    let content = String(text).replace(/\n/g, '');
    let scale = 1;

    if (!content.length) {
      content = '.';
    }

    tspan.node.textContent = content.replace(/ /g, ' ');
    tspan.attr('xml:space', 'preserve');
    tspan.attr('text-rendering', 'optimizeSpeed');

    let color = style.color;
    let weight = style.weight;
    let fontStyle = style.style;
    let decoration = style.decoration;
    const isHyperlink = style.hyperlink >= 0;

    if (dataStyleOverride) {
      if (dataStyleOverride.textColor) {
        color = dataStyleOverride.textColor;
      }
      if (dataStyleOverride._curFieldStyle) {
        const fieldStyle = dataStyleOverride._curFieldStyle;
        for (let i = 0; i < fieldStyle.length; i++) {
          switch (fieldStyle[i].name) {
            case 'color':
              color = fieldStyle[i].val;
              break;
            case 'font-weight':
              weight = fieldStyle[i].val;
              break;
            case 'font-style':
              fontStyle = fieldStyle[i].val;
              break;
            case 'text-decoration':
              if (fieldStyle[i].val === 'underline') {
                dataStyleOverride._curFieldDecoration = fieldStyle[i].val;
                decoration = null;
              } else {
                decoration = fieldStyle[i].val;
              }
              break;
          }
        }
      }
    }

    if (style) {
      if (style.baseOffset === 'sub' || style.baseOffset === 'super') {
        scale = 0.8;
      }

      if (style.font) {
        style.mappedFont = style.mappedFont || doc.MapFont(style.font, style.type);
        tspan.attr('font-family', style.mappedFont);
      }

      if (style.size) {
        let size = style.size;
        if (!isNaN(size)) {
          size *= scale;
          tspan.attr('font-size', size);
        }
      }

      tspan.attr('font-weight', weight);
      tspan.attr('font-style', fontStyle);

      if (decoration) {
        tspan.attr('text-decoration', decoration);
      }

      if (!isHyperlink || !linksDisabled) {
        tspan.attr('fill', color);
      }

      tspan.attr('opacity', style.colorTrans);

      if (isHyperlink && !linksDisabled) {
        tspan.attr('fill', '#0000FF');
      }
    }

    return tspan;
  }

  CalcFromRuntime = function (e, t) {
    var a,
      r,
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
      g,
      h,
      m,
      C,
      y,
      f,
      L,
      I,
      T,
      b = this.DefaultFmtText(),
      M = t ? t.maxWidth : 0,
      P = t ? t.minWidth : 0,
      R = 0,
      A = null;
    return b.text = String(e.text),
      e.styles.forEach((function (e) {
        b.styles.push(e)
      }), this),
      b.hyperlinks = Utils.CopyObj(e.hyperlinks),
      M ||
      (M = 32000),
      b.fmtWidth = P,
      this.renderingEnabled ? (
        n = Math.max(this.GetBulletIndent(), 8),
        b.width = 0,
        b.dispMinWidth = 0,
        e.styleRuns.forEach(
          (
            function (t, P) {
              a = {
                pStyle: Utils.CopyObj(t.pStyle),
                width: 0,
                height: 0,
                start: t.start,
                length: t.nChars,
                bindent: 0,
                yOffset: R,
                dispMinWidth: 0,
                lines: []
              },
                o = 0,
                a.pStyle.bullet &&
                'none' != a.pStyle.bullet &&
                (o = n),
                l = o / 2 + 2,
                a.bindent = o,
                A ? A.clear() : (
                  (A = new T3Svg.Container(T3Svg.create('text'))).attr('xml:space', 'preserve'),
                  A.attr('fill-opacity', 0),
                  I = this.parent.doc.GetFormattingLayer()
                ),
                h = this.CalcParagraphRunMetrics(e, t, A, I),
                C = null;
              do {
                if (
                  s = a.lines.length ? a.pStyle.lindent : a.pStyle.pindent,
                  o &&
                  (s = 0),
                  y = M - (o + a.pStyle.rindent + s),
                  (m = this.BuildLineForDisplay(h, y, C, a.pStyle)).runs.length
                ) {
                  for (
                    r = {
                      width: 0,
                      height: 0,
                      start: t.start,
                      length: 0,
                      bindent: a.bindent,
                      indent: s,
                      yOffset: R,
                      ascent: 0,
                      descent: 0,
                      dispMinWidth: 0,
                      runs: [],
                      spErrors: [],
                      dataFields: []
                    },
                    s += o,
                    a.lines.length &&
                    (r.start = m.runs[0].start),
                    c = 0;
                    c < m.runs.length;
                    c++
                  ) {
                    if (
                      i = m.runs[c],
                      g = i.source,
                      delete i.source,
                      r.runs.push(i),
                      e.spErrors &&
                      g &&
                      i.extraYOffset <= 0 &&
                      !i.isTab
                    ) for (u = 0; u < e.spErrors.length; u++) f = e.spErrors[u].startIndex,
                      L = e.spErrors[u].startIndex + e.spErrors[u].nChars - 1,
                      f < i.dispStart + i.dispLen &&
                      L >= i.dispStart &&
                      (
                        (d = {}).startIndex = Math.max(f, i.dispStart),
                        d.endIndex = Math.min(L, i.dispStart + i.dispLen - 1),
                        p = d.startIndex - i.start + g.startRunChar,
                        T = SDGraphics.Text.Formatter.GetRunPositionForChar(g.runElem.node, p, !0, g.cache),
                        d.startPos = r.width + (T - g.startRunPos),
                        p = d.endIndex - i.start + g.startRunChar,
                        T = SDGraphics.Text.Formatter.GetRunPositionForChar(g.runElem.node, p, !1, g.cache),
                        d.endPos = r.width + (T - g.startRunPos),
                        r.spErrors.push(d)
                      );
                    if (e.dataFields && g && !i.isTab) for (u = 0; u < e.dataFields.length; u++) f = e.dataFields[u].startIndex,
                      L = e.dataFields[u].startIndex + e.dataFields[u].nChars - 1,
                      f < i.dispStart + i.dispLen &&
                      L >= i.dispStart &&
                      (
                        (D = {}).fieldID = e.dataFields[u].fieldID,
                        D.startIndex = Math.max(f, i.dispStart),
                        D.endIndex = Math.min(L, i.dispStart + i.dispLen - 1),
                        p = D.startIndex - i.start + g.startRunChar,
                        T = SDGraphics.Text.Formatter.GetRunPositionForChar(g.runElem.node, p, !0, g.cache),
                        D.startPos = r.width + (T - g.startRunPos),
                        p = D.endIndex - i.start + g.startRunChar,
                        T = SDGraphics.Text.Formatter.GetRunPositionForChar(g.runElem.node, p, !1, g.cache),
                        D.endPos = r.width + (T - g.startRunPos),
                        r.dataFields.push(D)
                      );
                    r.descent < i.descent &&
                      (r.descent = i.descent),
                      r.ascent < i.ascent &&
                      (r.ascent = i.ascent),
                      r.length += i.length,
                      r.width += i.width,
                      c < m.runs.length - 1 ? r.dispMinWidth += i.width : r.dispMinWidth += i.dispMinWidth
                  }
                  if (
                    r.height = r.ascent + r.descent,
                    P < e.styleRuns.length - 1 ||
                    m.nextRunInfo &&
                    m.runs.length
                  ) if (a.pStyle.spacing < 0) {
                    var _ = - a.pStyle.spacing - r.height;
                    _ > 0 &&
                      (r.height += _)
                  } else r.height += r.height * a.pStyle.spacing;
                  a.width < r.width + s &&
                    (a.width = r.width + s),
                    a.dispMinWidth < r.dispMinWidth + s &&
                    (a.dispMinWidth = r.dispMinWidth + s),
                    a.height += r.height,
                    R += r.height,
                    a.lines.push(r)
                }
                C = m.nextRunInfo
              } while (C && m.runs.length);
              I.svgObj.remove(A),
                b.height += a.height,
                o > 0 &&
                a.lines.length &&
                a.height < l &&
                (
                  S = (l - a.height) / 2,
                  a.lines.forEach((function (e) {
                    e.yOffset += S
                  }), this),
                  S = l - a.height,
                  R += S,
                  b.height += S
                ),
                b.paragraphs.push(a),
                b.width < a.width &&
                (b.width = a.width),
                b.dispMinWidth < a.dispMinWidth &&
                (b.dispMinWidth = a.dispMinWidth)
            }
          ),
          this
        ),
        b.fmtWidth < b.width &&
        (b.fmtWidth = b.width),
        b
      ) : (this.deferredRenderNeeded = !0, b)
  }

  GetBulletIndent = function () {
    let indent = 0;
    const bulletIndex = this.GetBulletPIndex();
    if (this.rtData.styleRuns && bulletIndex < this.rtData.styleRuns.length) {
      const bulletRun = this.rtData.styleRuns[bulletIndex].runs;
      if (bulletRun && bulletRun.length) {
        indent = bulletRun[0].metrics.ascent;
      }
    }
    return indent;
  }

  GetBulletPIndex = function () {
    if (this.rtData.styleRuns) {
      for (let i = 0; i < this.rtData.styleRuns.length; i++) {
        const pStyle = this.rtData.styleRuns[i].pStyle;
        if (pStyle && pStyle.bullet && pStyle.bullet !== "none") {
          return i;
        }
      }
    }
    return 0;
  }

  CalcParagraphRunMetrics = function (e, t, a, r) {
    const spaceRegex = /(\s+)/g;
    const tabRegex = /(\t+)/g;
    let runs = [];
    let tabRuns = [];

    // Process each run in the paragraph
    for (let i = 0; i < t.runs.length; i++) {
      const start = t.runs[i].start;
      const nChars = t.runs[i].nChars;
      const style = t.runs[i].style;
      const text = nChars ? e.text.substr(start, nChars) : "";
      let tabs = [];

      // Find tab characters in the text
      let match;
      while ((match = tabRegex.exec(text)) !== null) {
        tabs.push({
          start: match.index,
          end: match.index + match[0].length,
          nChars: match[0].length
        });
      }

      // Split the run into tab and non-tab segments
      if (tabs.length) {
        if (tabs[0].start > 0) {
          tabRuns.push({
            start: start,
            nChars: tabs[0].start,
            style: style,
            metrics: t.runs[i].metrics
          });
        }
        for (let j = 0; j < tabs.length; j++) {
          tabRuns.push({
            start: start + tabs[j].start,
            nChars: tabs[j].nChars,
            style: style,
            metrics: t.runs[i].metrics,
            isTab: true
          });
          if (tabs[j].end < nChars) {
            if (j < tabs.length - 1) {
              tabRuns.push({
                start: start + tabs[j].end,
                nChars: tabs[j + 1].start - tabs[j].end,
                style: style,
                metrics: t.runs[i].metrics
              });
            } else {
              tabRuns.push({
                start: start + tabs[j].end,
                nChars: nChars - tabs[j].end,
                style: style,
                metrics: t.runs[i].metrics
              });
            }
          }
        }
      } else {
        tabRuns.push({
          start: start,
          nChars: nChars,
          style: style,
          metrics: t.runs[i].metrics
        });
      }
    }

    // Process each tab run
    for (let i = 0; i < tabRuns.length; i++) {
      const start = tabRuns[i].start;
      const nChars = tabRuns[i].nChars;
      const style = e.styles[tabRuns[i].style];
      const hasCR = nChars && "\n" === e.text[start + nChars - 1];
      const text = nChars ? e.text.substr(start, nChars) : "";
      let breaks = [];

      // Find space characters in the text
      let match;
      while ((match = spaceRegex.exec(text)) !== null) {
        breaks.push({
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          startPos: 0,
          endPos: 0
        });
      }

      let run = {
        startIndex: start,
        endIndex: start + nChars,
        nChars: nChars,
        style: style,
        breaks: breaks,
        str: text,
        startDispIndex: 0,
        endDispIndex: nChars,
        width: 0,
        startDispPos: 0,
        endDispPos: 0,
        hasCR: hasCR,
        runRT: tabRuns[i],
        isTab: tabRuns[i].isTab
      };

      // Adjust display indices for breaks
      if (breaks.length && !style.dataField) {
        if (breaks[0].startIndex === 0) {
          run.startDispIndex = breaks[0].endIndex;
        }
        if (breaks[breaks.length - 1].endIndex === nChars) {
          run.endDispIndex = breaks[breaks.length - 1].startIndex;
        }
      }

      // Create text run element
      let runElem = null;
      let cache = null;
      if (nChars && !run.isTab) {
        const displayText = text + ".";
        runElem = this.CreateTextRunElem(displayText, style, this.parent.doc, this.parent.linksDisabled, null);
        runElem.attr("x", 0);
        runElem.attr("text-anchor", "start");
        runElem.attr("y", 0);
        a.add(runElem);
        cache = this.parent.doc.GetTextRunCache(style, displayText);
      }

      run.runElem = runElem;
      run.cache = cache;
      runs.push(run);
    }

    // Calculate positions for each run
    r.svgObj.add(a);
    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      const runElem = run.runElem;
      if (runElem) {
        const lastCharIndex = run.endIndex - run.startIndex - 1;
        const endPos = this.GetRunPositionForChar(runElem.node, lastCharIndex, false, run.cache);
        run.width = endPos;
        run.endDispPos = run.width;

        for (let j = 0; j < run.breaks.length; j++) {
          const breakInfo = run.breaks[j];
          if (breakInfo.startIndex > 0) {
            const startPos = this.GetRunPositionForChar(runElem.node, breakInfo.startIndex, true, run.cache);
            breakInfo.startPos = startPos;
          }
          if (breakInfo.endIndex === run.nChars) {
            breakInfo.endPos = run.width;
          } else {
            const endPos = this.GetRunPositionForChar(runElem.node, breakInfo.endIndex, true, run.cache);
            breakInfo.endPos = endPos;
          }
          if (j === 0 && breakInfo.startIndex === 0 && !run.style.dataField) {
            run.startDispPos = breakInfo.endPos;
          }
          if (j === run.breaks.length - 1 && breakInfo.endIndex === run.nChars && !run.style.dataField) {
            run.endDispPos = breakInfo.startPos;
          }
        }
      }
    }

    return runs;
  }

  BuildLineForDisplay = function (runs, maxWidth, currentRunInfo, paragraphStyle) {
    let runIndex = 0, charIndex = 0, currentPos = 0, remainingWidth = maxWidth, lineWidth = 0, lineRuns = [], nextRunInfo = null;

    if (currentRunInfo) {
      runIndex = currentRunInfo.curRun || 0;
      charIndex = currentRunInfo.curChar || 0;
      currentPos = currentRunInfo.curPos || 0;
      charIndex = Math.max(charIndex, runs[runIndex].startDispIndex);
      currentPos = Math.max(currentPos, runs[runIndex].startDispPos);
      currentRunInfo = null;
    }

    while (runIndex < runs.length && remainingWidth > 0) {
      const run = runs[runIndex];
      const runWidth = Math.max(run.endDispPos - currentPos, 0);

      if (runWidth > remainingWidth) break;

      const lineRun = {
        width: Math.min(run.width - currentPos, remainingWidth),
        height: run.runRT.metrics.height,
        start: run.startIndex + charIndex,
        length: run.nChars - charIndex,
        dispStart: run.startIndex + charIndex,
        dispLen: Math.max(run.endDispIndex - charIndex, 0),
        dispWidth: runWidth,
        dispMinWidth: runWidth,
        space: run.runRT.metrics.width,
        ascent: run.runRT.metrics.ascent,
        descent: run.runRT.metrics.descent,
        extraYOffset: run.runRT.metrics.extraYOffset,
        isTab: run.isTab,
        style: run.runRT.style,
        source: {
          runElem: run.runElem,
          cache: run.cache,
          startRunChar: charIndex,
          startRunPos: currentPos
        }
      };

      if (lineRun.isTab && paragraphStyle.tabspace > 0) {
        const tabWidth = Math.ceil(lineWidth / paragraphStyle.tabspace) * paragraphStyle.tabspace;
        lineRun.width = tabWidth - lineWidth;
      }

      if (run.hasCR) lineRun.length++;

      if (lineRun.width > 0) {
        lineRuns.push(lineRun);
        remainingWidth -= lineRun.width;
        lineWidth += lineRun.width;
      }

      runIndex++;
      currentPos = 0;
      charIndex = 0;
    }

    if (runIndex < runs.length) {
      nextRunInfo = {
        curRun: runIndex,
        curChar: charIndex,
        curPos: currentPos
      };

      if (remainingWidth > 0) {
        const run = runs[runIndex];
        const breakIndex = run.breaks.findIndex(b => b.endIndex > charIndex);

        if (breakIndex >= 0 && run.breaks[breakIndex].startPos - currentPos <= remainingWidth) {
          nextRunInfo.curChar = run.breaks[breakIndex].endIndex;
          nextRunInfo.curPos = run.breaks[breakIndex].endPos;

          const lineRun = {
            width: Math.min(nextRunInfo.curPos - currentPos, remainingWidth),
            height: run.runRT.metrics.height,
            start: run.startIndex + charIndex,
            length: nextRunInfo.curChar - charIndex,
            dispStart: run.startIndex + charIndex,
            dispLen: run.breaks[breakIndex].startIndex - charIndex,
            dispWidth: run.breaks[breakIndex].startPos - currentPos,
            dispMinWidth: run.breaks[breakIndex].startPos - currentPos,
            space: run.runRT.metrics.width,
            ascent: run.runRT.metrics.ascent,
            descent: run.runRT.metrics.descent,
            extraYOffset: run.runRT.metrics.extraYOffset,
            isTab: run.isTab,
            style: run.runRT.style,
            source: {
              runElem: run.runElem,
              cache: run.cache,
              startRunChar: charIndex,
              startRunPos: currentPos
            }
          };

          lineRuns.push(lineRun);
        }
      }
    }

    return {
      runs: lineRuns,
      nextRunInfo: nextRunInfo
    };
  }

  GetTextFormatSize = function () {
    var e = Math.max(this.fmtText.width, this.limits.minWidth);
    return this.limits.maxWidth && (e = Math.min(e, this.limits.maxWidth)),
    {
      width: e,
      height: this.fmtText.height
    }
  }

  RenderFormattedText = function (textContainer, formattingLayer) {
    var textRun, textStyle, textContent, lineMetrics, bulletMetrics, bulletStyle, bulletElement, underlineMetrics, spellErrorMetrics, dataFieldMetrics, renderedLine, renderedRun, textRunElement, textRunCache, underlineColor, bulletInfo = [], underlineInfo = [], spellErrorInfo = [], parent = textContainer.parent;
    if (parent) {
      dataFieldMetrics = textContainer.position();
      parent.remove(textContainer);
    }
    textContainer.clear();
    textContainer.attr("xml:space", "preserve");
    this.renderedLines = [];
    this.renderedDataFields = [];
    formattingLayer.clear();

    console.log('RenderFormattedText', this.fmtText);

    this.fmtText.paragraphs.forEach((function (paragraph, paragraphIndex) {
      bulletElement = null;
      if (paragraph.pStyle.bullet !== "none" && paragraph.bindent) {
        bulletElement = {
          bullet: paragraph.pStyle.bullet,
          xPos: 0,
          yPos: paragraph.yOffset,
          indent: paragraph.bindent,
          height: paragraph.height,
          ascent: paragraph.height / 2,
          hasText: !1,
          style: this.GetBulletStyle(paragraphIndex)
        };
      }
      paragraph.lines.forEach((function (line, lineIndex) {
        textRun = 0;
        lineMetrics = line.width + paragraph.bindent;
        bulletMetrics = this.fmtText.fmtWidth - (line.indent + paragraph.pStyle.rindent);
        switch (paragraph.pStyle.just) {
          case "center":
            textRun = (bulletMetrics - lineMetrics) / 2;
            break;
          case "right":
            textRun = bulletMetrics - lineMetrics;
        }
        textRun += line.indent;
        if (bulletElement && lineIndex === 0) {
          bulletElement.xPos = textRun;
          bulletElement.yPos = line.yOffset;
          bulletElement.ascent = line.ascent;
        }
        textRun += line.bindent;
        renderedLine = {
          paraIndex: paragraphIndex,
          lineIndex: lineIndex,
          lineRec: line,
          left: textRun,
          right: textRun,
          top: line.yOffset,
          bottom: line.yOffset + line.height,
          dispStart: line.start,
          pStyle: paragraph.pStyle,
          runs: []
        };
        for (spellErrorMetrics = 0; spellErrorMetrics < line.spErrors.length; spellErrorMetrics++) {
          spellErrorInfo.push({
            x: textRun + line.spErrors[spellErrorMetrics].startPos,
            y: line.yOffset + line.ascent,
            width: line.spErrors[spellErrorMetrics].endPos - line.spErrors[spellErrorMetrics].startPos
          });
        }
        for (spellErrorMetrics = 0; spellErrorMetrics < line.dataFields.length; spellErrorMetrics++) {
          this.renderedDataFields.push({
            x: textRun + line.dataFields[spellErrorMetrics].startPos,
            y: line.yOffset,
            width: line.dataFields[spellErrorMetrics].endPos - line.dataFields[spellErrorMetrics].startPos,
            height: line.height,
            fieldID: line.dataFields[spellErrorMetrics].fieldID
          });
        }
        line.runs.forEach((function (run, runIndex) {
          if (bulletElement) bulletElement.hasText = run.width > 0;
          textRunElement = null;
          textRunCache = null;
          textStyle = this.fmtText.styles[run.style];
          textContent = this.fmtText.text.substr(run.dispStart, run.dispLen);
          var isHyperlink = !1;
          var dataStyleOverride = this.parent.dataStyleOverride || {};
          dataStyleOverride._curFieldDecoration = null;
          dataStyleOverride._curFieldStyle = null;
          if (run.dispLen > 0 && !run.isTab) {
            if (textStyle.dataField) dataStyleOverride._curFieldStyle = this.parent.GetDataStyle(textStyle.dataField);
            textRunElement = this.CreateTextRunElem(textContent, textStyle, this.parent.doc, this.parent.linksDisabled, dataStyleOverride);
            textRunElement.attr("x", Utils.RoundCoord(textRun));
            textRunElement.attr("text-anchor", "start");
            textRunElement.attr("y", Utils.RoundCoord(line.yOffset + line.ascent + run.extraYOffset));
            textRunElement.attr("textLength", run.dispWidth);
            textContainer.add(textRunElement);
            textRunCache = this.parent.doc.GetTextRunCache(textStyle, textContent);
          }
          if (("underline" == (dataStyleOverride._curFieldDecoration || textStyle.decoration) || isHyperlink) && run.extraYOffset <= 0) {
            underlineColor = isHyperlink ? "#0000FF" : textStyle.color;
            underlineInfo.push({
              x: textRun,
              y: line.yOffset + line.ascent,
              width: run.width,
              color: underlineColor
            });
          }
          if (!renderedLine.runs.length) renderedLine.dispStart = run.dispStart;
          renderedLine.runs.push({
            runIndex: runIndex,
            runRec: run,
            left: textRun,
            right: textRun + run.width,
            isTab: run.isTab,
            elem: textRunElement,
            cache: textRunCache
          });
          textRun += run.width;
        }), this);
        renderedLine.right = textRun;
        this.renderedLines.push(renderedLine);
      }), this);
      if (bulletElement && bulletElement.hasText) this.RenderBullet(bulletElement, formattingLayer);
    }), this);
    for (spellErrorMetrics = 0; spellErrorMetrics < underlineInfo.length; spellErrorMetrics++) {
      this.RenderUnderline(underlineInfo[spellErrorMetrics], formattingLayer);
    }
    if (parent) parent.add(textContainer, dataFieldMetrics);
  }

  GetRunPositionForChar = function (element, charIndex, isStart, cache, offset = 0) {

    if (charIndex < 0) return -1;

    let position;
    const offsets = isStart ? cache?.startOffsets : cache?.endOffsets;

    if (offsets && offsets.length > charIndex) {
      position = offsets[charIndex];
    }

    if (position === undefined) {
      position = -1;
      try {
        const charPosition = isStart ? element.getStartPositionOfChar(charIndex) : element.getEndPositionOfChar(charIndex);
        position = charPosition.x - offset;
        if (offsets) {
          offsets[charIndex] = position;
        }
      } catch (error) {
        // Handle error if needed
      }
    }

    return position;
  }
}

export default Formatter;
