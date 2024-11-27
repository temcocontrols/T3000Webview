
import Element from './Element';
import * as Utils from '../Hvac.Utils';
// import * as SVG from '@svgdotjs/svg.js';
import SVG from '../Hvac.SVG';
import Path from './Path';
import Rect from './Rect';

enum CursorState {
  NONE = 0,
  EDITONLY = 1,
  EDITLINK = 2,
  LINKONLY = 3
}

enum WordState {
  WRONG = 0,
  CORRECT = 1,
  NOTPROCESSED = 2
}

enum CursorType {
  AUTO = 'cur-auto',
  DEFAULT = 'cur-default',
  POINTER = 'cur-pointer',
}

class Formatter {

  public parent: any;
  public limits: { minWidth: number; maxWidth: number; };
  public fmtText: any;
  public rtData: any;
  public renderedLines: any[];
  public wordList: any;
  public renderingEnabled: boolean;
  public deferredRenderNeeded: boolean;
  public contentVersion: number;
  public spellCheckEnabled: boolean;
  public dataNameEnabled: boolean;

  constructor(e) {
    this.parent = e,
      this.limits = {
        minWidth: 0,
        maxWidth: 0
      },
      this.fmtText = this.DefaultFmtText(),
      this.rtData = this.DefaultRuntimeText(),
      this.renderedLines = [],
      this.wordList = null,
      this.renderingEnabled = !0,
      this.deferredRenderNeeded = !1,
      this.contentVersion = 0,
      this.spellCheckEnabled = !1,
      this.dataNameEnabled = !1
  }

  DefaultFmtText() {
    return {
      width: 5,
      height: 11,
      fmtWidth: 11,
      text: '',
      paragraphs: [],
      styles: [],
      hyperlinks: []
    };
  }

  DefaultRuntimeText() {
    return {
      text: '',
      charStyles: [],
      styleRuns: [],
      styles: [
        this.DefaultStyle()
      ],
      hyperlinks: []
    };
  }

  DefaultStyle() {
    return {
      font: 'Arial',
      type: 'sanserif',
      size: 10,
      weight: 'normal',
      style: 'normal',
      baseOffset: 'none',
      decoration: 'none',
      color: '#000',
      colorTrans: 1,
      spError: false,
      dataField: null,
      hyperlink: -1
    };
  }

  DefaultPStyle = () => {
    return {
      just: 'left',
      bullet: 'none',
      spacing: 0,
      pindent: 0,
      lindent: 0,
      rindent: 0,
      tabspace: 0
    }
  }

  SetText(e: string, t?: number, a?: number, r?: any, i?: boolean) {
    let n: number;
    let o: number[];
    let s: string;
    let l: number;
    let S: number;
    let c: any;
    let u: any;
    let p: boolean;
    let d: number;
    let D = this.DefaultPStyle();
    let g: any[] = [];
    let h = false;
    let m = -1;
    let C = '';
    let y = '';

    e = String(e).replace(/(\r\n|\r|\u2028|\u2029)/g, '\n').replace(/([\u0000-\u0008]|[\u000B-\u001F])/g, '');
    a = a == null ? 0 : Math.min(Math.max(a, 0), this.rtData.text.length);
    r = r == null || r > this.rtData.text.length - a ? this.rtData.text.length - a : r;

    if (typeof t === 'number') {
      n = t;
    } else if (!this.rtData.text.length || a >= this.rtData.text.length - 1) {
      n = Math.max(this.rtData.styles.length - 1, 0);
      h = true;
    } else if (r > 0) {
      n = this.GetFormatAtOffset(a).id;
      m = this.GetFormatAtOffset(a + r).id;
    } else {
      n = this.GetFormatAtOffset(a - 1).id;
      m = this.GetFormatAtOffset(a).id;
    }

    if (a === 0) h = true;
    if (m < 0) m = n;

    S = this.GetTextParagraphCount(e);
    l = this.GetParagraphAtOffset(a);
    if (l >= 0) D = this.rtData.styleRuns[l].pStyle;

    for (d = 0; d < S; d++) {
      g.push({ pStyle: Utils.CopyObj(D) });
    }

    g = this.MergeParagraphInfo(g, a, r);

    if (a === this.rtData.text.length) {
      s = this.rtData.text + e;
    } else {
      if (a > 0) C = this.rtData.text.slice(0, a);
      if (a + r < this.rtData.text.length) y = this.rtData.text.slice(a + r);
      s = C + e + y;
    }

    if (!i && this.parent.CallEditCallback('onbeforeinsert', s) === false) return;

    this.rtData.text = s;
    this.contentVersion++;

    if (!this.rtData.styles.length) {
      this.rtData.styles = [this.DefaultStyle()];
    }

    c = this.GetFormatByID(n);
    u = this.GetFormatByID(m);

    if (c.hyperlink !== u.hyperlink) h = true;
    if (c.dataField || h) {
      c = Utils.CopyObj(c);
      c.dataField = null;
      if (h) c.hyperlink = -1;
      n = this.FindAddStyle(c);
    }

    if (e.length) {
      o = new Array(e.length).fill(n);
      this.rtData.charStyles.splice(a, r, ...o);
      if (t && typeof t === 'object') this.SetFormat(t, a, e.length);
    } else if (r) {
      this.rtData.charStyles.splice(a, r);
      if (!this.rtData.text.length) {
        if (t && typeof t === 'object') {
          t.hyperlink = -1;
          t.dataField = null;
          n = this.SetFormat(t, 0, 0);
        }
        t = this.GetFormatByID(n);
        this.rtData.styles = [Utils.CopyObj(t)];
      }
    }

    p = this.renderingEnabled;
    this.SetRenderingEnabled(false);
    this.BuildRuntimeRuns(this.rtData, g);
    this.AdjustSpellCheck(e);
    if (p) this.SetRenderingEnabled(true);
  }

  SpellCheckValid(): boolean {
    return this.spellCheckEnabled &&
      this.parent.doc.spellChecker &&
      this.parent.doc.spellChecker.GetActive() &&
      this.parent.IsActive();
  }

  GetContentVersion = () => {
    return this.contentVersion
  }

  GetTextFormatSize() {
    let width = Math.max(this.fmtText.width, this.limits.minWidth);
    if (this.limits.maxWidth) {
      width = Math.min(width, this.limits.maxWidth);
    }
    return {
      width,
      height: this.fmtText.height
    };
  }

  BuildWordList() {
    const wordList = {
      textID: this.parent.GetInternalID(),
      sessionID: this.GetContentVersion(),
      list: []
    };

    const regex = /(([^\u0000-\u2FFF]|[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u0386-\u04FF\u1E00-\u1FFF])+)(([\u0027\u0060\u2018\u2019\u2032](([^\u0000-\u2FFF]|[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u0386-\u04FF\u1E00-\u1FFF])+))*)/g;
    let match;

    while ((match = regex.exec(this.rtData.text)) !== null) {
      const word = match[0].replace(/[\u0027\u0060\u2018\u2019\u2032]/g, '\'');
      wordList.list.push({
        word,
        start: match.index,
        end: match.index + match[0].length,
        status: WordState.NOTPROCESSED,
        auto: false,
        needSuggest: true,
        suggestions: null
      });
    }

    return wordList;
  }

  MergeWordLists(e, t) {
    for (const r of e.list) {
      const match = t.list.find(word => word.word === r.word);
      if (match) {
        match.status = r.status;
        match.auto = r.auto;
        match.needSuggest = r.needSuggest;
        match.suggestions = r.suggestions;
      }
    }
  }

  GetWordList() {
    if (this.wordList && this.wordList.sessionID === this.GetContentVersion()) {
      return this.wordList;
    }

    const previousWordList = this.wordList;
    this.wordList = this.BuildWordList();

    if (previousWordList) {
      this.MergeWordLists(previousWordList, this.wordList);
    }

    return this.wordList;
  }

  AdjustSpellCheck(e: string) {
    const isSingleChar = e && e.length === 1;
    const hasValidChars = isSingleChar && /[^\u0000-\u2FFF]|[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u0386-\u04FF\u1E00-\u1FFF]/.test(e);
    let needsProcessing = false;

    if (this.SpellCheckValid() && this.parent.IsActive()) {
      const wordList = this.GetWordList();
      if (!hasValidChars) {
        for (const word of wordList.list) {
          if (word.status === WordState.NOTPROCESSED) {
            needsProcessing = true;
            break;
          }
        }
      }
      if (needsProcessing) {
        this.parent.DoSpellCheck();
      } else {
        this.UpdateSpellCheckFormatting();
      }
    } else {
      this.wordList = null;
    }
  }

  UpdateSpellCheckFormatting() {
    if (!this.SpellCheckValid()) {
      this.SetFormat({ spError: false });
      this.wordList = null;
      return;
    }

    const wordList = this.GetWordList();
    const wordCount = wordList.list.length;

    this.SetFormat({ spError: false }, null, null, true);

    for (let i = 0; i < wordCount; i++) {
      const word = wordList.list[i];
      const start = word.start;
      const end = word.end;

      if (word.status !== WordState.WRONG || this.IsDataFieldInRange(start, end)) {
        continue;
      }

      this.SetFormat({ spError: true }, start, word.word.length, true);
    }

    if (this.renderingEnabled) {
      const styleRuns = this.rtData.styleRuns.map(run => ({ pStyle: Utils.CopyObj(run.pStyle) }));
      this.BuildRuntimeRuns(this.rtData, styleRuns);
      this.fmtText = this.CalcFromRuntime(this.rtData, this.limits);
    }
  }

  GetBulletPIndex(): number {
    if (this.rtData.styleRuns) {
      for (let i = 0; i < this.rtData.styleRuns.length; i++) {
        const pStyle = this.rtData.styleRuns[i].pStyle;
        if (pStyle && pStyle.bullet && pStyle.bullet !== 'none') {
          return i;
        }
      }
    }
    return 0;
  }

  GetBulletIndent(): number {
    const bulletIndex = this.GetBulletPIndex();
    if (
      this.rtData.styleRuns &&
      bulletIndex < this.rtData.styleRuns.length &&
      this.rtData.styleRuns[bulletIndex].runs &&
      this.rtData.styleRuns[bulletIndex].runs.length
    ) {
      return this.rtData.styleRuns[bulletIndex].runs[0].metrics.ascent;
    }
    return 0;
  }

  CalcParagraphRunMetrics(e, t, a, r) {
    const I = /(\s+)/g;
    const T = /(\t+)/g;
    const D = [];
    const g = [];

    t.runs.forEach(run => {
      const { start: S, nChars: c, style: L } = run;
      const i = c ? e.text.substr(S, c) : '';
      const d = [];

      let n;
      while ((n = T.exec(i))) {
        d.push({ start: n.index, end: n.index + n[0].length, nChars: n[0].length });
      }

      if (d.length) {
        if (d[0].start > 0) {
          g.push({ start: S, nChars: d[0].start, style: L, metrics: run.metrics });
        }
        d.forEach((tab, s) => {
          g.push({ start: S + tab.start, nChars: tab.nChars, style: L, metrics: run.metrics, isTab: true });
          if (tab.end < c) {
            const nextStart = s < d.length - 1 ? d[s + 1].start : c;
            g.push({ start: S + tab.end, nChars: nextStart - tab.end, style: L, metrics: run.metrics });
          }
        });
      } else {
        g.push({ start: S, nChars: c, style: L, metrics: run.metrics });
      }
    });

    g.forEach(run => {
      const { start: S, nChars: c, style: L } = run;
      const f = c && e.text[S + c - 1] === '\n';
      const i = c ? e.text.substr(S, c) : '';
      const u = [];

      let n;
      while ((n = I.exec(i))) {
        u.push({ startIndex: n.index, endIndex: n.index + n[0].length, startPos: 0, endPos: 0 });
      }

      const h = {
        startIndex: S,
        endIndex: S + c,
        nChars: c,
        style: L,
        breaks: u,
        str: i,
        startDispIndex: 0,
        endDispIndex: c,
        width: 0,
        startDispPos: 0,
        endDispPos: 0,
        hasCR: f,
        runRT: run,
        isTab: run.isTab === true,
      };

      if (u.length && !L.dataField) {
        if (u[0].startIndex === 0) h.startDispIndex = u[0].endIndex;
        if (u[u.length - 1].endIndex === c) h.endDispIndex = u[u.length - 1].startIndex;
      }

      let m = null;
      let C = null;
      if (c && !h.isTab) {
        const text = i + '.';
        m = this.CreateTextRunElem(text, L, this.parent.doc, this.parent.linksDisabled, null);
        m.attr('x', 0);
        m.attr('text-anchor', 'start');
        m.attr('y', 0);
        a.add(m);
        C = null;//this.parent.doc.GetTextRunCache(L, text);
      }

      h.runElem = m;
      h.cache = C;
      D.push(h);
    });

    r.svgObj.add(a);

    D.forEach(h => {
      const m = h.runElem;
      if (m) {
        const l = h.endIndex - h.startIndex - 1;
        const y = this.GetRunPositionForChar(m.node, l, false, h.cache);
        h.width = y;
        h.endDispPos = h.width;

        h.breaks.forEach((p, s) => {
          if (p.startIndex > 0) {
            const l = p.startIndex;
            const y = this.GetRunPositionForChar(m.node, l, true, h.cache);
            p.startPos = y;
          }
          if (p.endIndex === h.nChars) {
            p.endPos = h.width;
          } else {
            const l = p.endIndex;
            const y = this.GetRunPositionForChar(m.node, l, true, h.cache);
            p.endPos = y;
          }
          if (s === 0 && p.startIndex === 0 && !h.style.dataField) {
            h.startDispPos = p.endPos;
          }
          if (s === h.breaks.length - 1 && p.endIndex === h.nChars && !h.style.dataField) {
            h.endDispPos = p.startPos;
          }
        });
      }
    });

    return D;
  }

  GetRunPositionForChar = (e, t, a, r, i) => {
    if (t < 0)
      return -1;
    var n, o;
    if (i = i || 0,
      r && r.startOffsets && r.endOffsets && r.startOffsets.length > t && (n = (o = a ? r.startOffsets : r.endOffsets)[t]),
      void 0 === n) {
      n = -1;
      try {
        n = (a ? e.getStartPositionOfChar(t) : e.getEndPositionOfChar(t)).x - i,
          o && (o[t] = n)
      } catch (e) { }
    }
    return n
  }

  CalcFromRuntime = (e, t) => {
    var a, r, i, n, o, s, l, S, c, u, p, d, D, g, h, m, C, y, f, L, I, T, b = this.DefaultFmtText(), M = t ? t.maxWidth : 0, P = t ? t.minWidth : 0, R = 0, A = null;
    return b.text = String(e.text),
      e.styles.forEach((function (e) {
        b.styles.push(e)
      }
      ), this),
      b.hyperlinks = Utils.CopyObj(e.hyperlinks),
      M || (M = 32e3),
      b.fmtWidth = P,
      this.renderingEnabled ? (n = Math.max(this.GetBulletIndent(), 8),
        b.width = 0,
        b.dispMinWidth = 0,
        e.styleRuns.forEach((function (t, P) {
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
            a.pStyle.bullet && "none" != a.pStyle.bullet && (o = n),
            l = o / 2 + 2,
            a.bindent = o,
            A ? A.clear() : ((A = new SVG.Container(SVG.create("text"))).attr("xml:space", "preserve"),
              A.attr("fill-opacity", 0),
              I = this.parent.doc.GetFormattingLayer()),
            h = this.CalcParagraphRunMetrics(e, t, A, I),
            C = null;
          do {
            if (s = a.lines.length ? a.pStyle.lindent : a.pStyle.pindent,
              o && (s = 0),
              y = M - (o + a.pStyle.rindent + s),
              (m = this.BuildLineForDisplay(h, y, C, a.pStyle)).runs.length) {
              for (r = {
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
                a.lines.length && (r.start = m.runs[0].start),
                c = 0; c < m.runs.length; c++) {
                if (i = m.runs[c],
                  g = i.source,
                  delete i.source,
                  r.runs.push(i),
                  e.spErrors && g && i.extraYOffset <= 0 && !i.isTab)
                  for (u = 0; u < e.spErrors.length; u++)
                    f = e.spErrors[u].startIndex,
                      L = e.spErrors[u].startIndex + e.spErrors[u].nChars - 1,
                      f < i.dispStart + i.dispLen && L >= i.dispStart && ((d = {}).startIndex = Math.max(f, i.dispStart),
                        d.endIndex = Math.min(L, i.dispStart + i.dispLen - 1),
                        p = d.startIndex - i.start + g.startRunChar,
                        T = this.GetRunPositionForChar(g.runElem.node, p, !0, g.cache),
                        d.startPos = r.width + (T - g.startRunPos),
                        p = d.endIndex - i.start + g.startRunChar,
                        T = this.GetRunPositionForChar(g.runElem.node, p, !1, g.cache),
                        d.endPos = r.width + (T - g.startRunPos),
                        r.spErrors.push(d));
                if (e.dataFields && g && !i.isTab)
                  for (u = 0; u < e.dataFields.length; u++)
                    f = e.dataFields[u].startIndex,
                      L = e.dataFields[u].startIndex + e.dataFields[u].nChars - 1,
                      f < i.dispStart + i.dispLen && L >= i.dispStart && ((D = {}).fieldID = e.dataFields[u].fieldID,
                        D.startIndex = Math.max(f, i.dispStart),
                        D.endIndex = Math.min(L, i.dispStart + i.dispLen - 1),
                        p = D.startIndex - i.start + g.startRunChar,
                        T = this.GetRunPositionForChar(g.runElem.node, p, !0, g.cache),
                        D.startPos = r.width + (T - g.startRunPos),
                        p = D.endIndex - i.start + g.startRunChar,
                        T = this.GetRunPositionForChar(g.runElem.node, p, !1, g.cache),
                        D.endPos = r.width + (T - g.startRunPos),
                        r.dataFields.push(D));
                r.descent < i.descent && (r.descent = i.descent),
                  r.ascent < i.ascent && (r.ascent = i.ascent),
                  r.length += i.length,
                  r.width += i.width,
                  c < m.runs.length - 1 ? r.dispMinWidth += i.width : r.dispMinWidth += i.dispMinWidth
              }
              if (r.height = r.ascent + r.descent,
                P < e.styleRuns.length - 1 || m.nextRunInfo && m.runs.length)
                if (a.pStyle.spacing < 0) {
                  var _ = -a.pStyle.spacing - r.height;
                  _ > 0 && (r.height += _)
                } else
                  r.height += r.height * a.pStyle.spacing;
              a.width < r.width + s && (a.width = r.width + s),
                a.dispMinWidth < r.dispMinWidth + s && (a.dispMinWidth = r.dispMinWidth + s),
                a.height += r.height,
                R += r.height,
                a.lines.push(r)
            }
            C = m.nextRunInfo
          } while (C && m.runs.length);
          I.svgObj.remove(A),
            b.height += a.height,
            o > 0 && a.lines.length && a.height < l && (S = (l - a.height) / 2,
              a.lines.forEach((function (e) {
                e.yOffset += S
              }
              ), this),
              S = l - a.height,
              R += S,
              b.height += S),
            b.paragraphs.push(a),
            b.width < a.width && (b.width = a.width),
            b.dispMinWidth < a.dispMinWidth && (b.dispMinWidth = a.dispMinWidth)
        }
        ), this),
        b.fmtWidth < b.width && (b.fmtWidth = b.width),
        b) : (this.deferredRenderNeeded = !0,
          b)
  }

  BuildLineForDisplay = function (e, t, a, r) {
    let d = 0, D = 0, g = 0, h = 0, m = !a;
    if (a) {
      d = a.curRun || 0;
      D = a.curChar || 0;
      g = a.curPos || 0;
      D = Math.max(D, e[d].startDispIndex);
      g = Math.max(g, e[d].startDispPos);
      a = null;
      while (d < e.length && e[d].startDispIndex >= e[d].endDispIndex) {
        d++;
        D = 0;
        g = 0;
      }
    }

    const i = { runs: [], nextRunInfo: null };
    let p = t;
    const S = { runIndex: -1, startChar: 0, endChar: 0, startPos: 0, endPos: 0, isRunEnd: !1, breakRec: null };

    while (d < e.length) {
      const o = e[d];
      const u = Math.max(o.endDispPos - g, 0);
      if (u > p) break;

      const n = {
        width: Math.min(o.width - g, p),
        height: o.runRT.metrics.height,
        start: o.startIndex + D,
        length: o.nChars - D,
        dispStart: o.startIndex + D,
        dispLen: Math.max(o.endDispIndex - D, 0),
        dispWidth: u,
        dispMinWidth: u,
        space: o.runRT.metrics.width,
        ascent: o.runRT.metrics.ascent,
        descent: o.runRT.metrics.descent,
        extraYOffset: o.runRT.metrics.extraYOffset,
        isTab: o.isTab,
        style: o.runRT.style,
        source: { runElem: o.runElem, cache: o.cache, startRunChar: D, startRunPos: g }
      };

      if (n.isTab && r.tabspace > 0) {
        const s = h - h % r.tabspace + r.tabspace * n.length;
        n.width = s - h;
      }

      if (o.hasCR) n.length++;
      if (n.width > 0) {
        const c = o.breaks.length - 1;
        if (c >= 0 && o.breaks[c].startIndex >= D) {
          Object.assign(S, {
            runIndex: i.runs.length,
            startChar: o.breaks[c].startIndex - D,
            endChar: o.breaks[c].endIndex - D,
            startPos: o.breaks[c].startPos - g,
            endPos: o.breaks[c].endPos - g,
            breakRec: o.breaks[c],
            rtRunIndex: d,
            rtRunPos: g,
            rtRunChar: D,
            isRunEnd: o.breaks[c].endIndex === o.nChars
          });
        }
        i.runs.push(n);
      }

      p -= n.width;
      h += n.width;
      d++;
      g = 0;
      D = 0;
    }

    if (d < e.length) {
      a = { curRun: d, curChar: D, curPos: g };
      if (p > 0) {
        let c = e[d].breaks.length - 1;
        let n = null;
        while (c >= 0 && e[d].breaks[c].endIndex > D) {
          if (e[d].breaks[c].startPos - g <= p) {
            Object.assign(a, { curChar: e[d].breaks[c].endIndex, curPos: e[d].breaks[c].endPos });
            n = {
              width: Math.min(a.curPos - g, p),
              height: e[d].runRT.metrics.height,
              start: e[d].startIndex + D,
              length: a.curChar - D,
              dispStart: e[d].startIndex + D,
              dispLen: e[d].breaks[c].startIndex - D,
              dispWidth: e[d].breaks[c].startPos - g,
              dispMinWidth: e[d].breaks[c].startPos - g,
              space: e[d].runRT.metrics.width,
              ascent: e[d].runRT.metrics.ascent,
              descent: e[d].runRT.metrics.descent,
              extraYOffset: e[d].runRT.metrics.extraYOffset,
              isTab: e[d].isTab,
              style: e[d].runRT.style,
              source: { runElem: e[d].runElem, cache: e[d].cache, startRunChar: D, startRunPos: g }
            };
            i.runs.push(n);
            break;
          }
          c--;
        }

        if (!n && S.runIndex >= 0 && !S.isRunEnd) {
          while (i.runs.length > S.runIndex + 1) i.runs.pop();
          Object.assign(i.runs[S.runIndex], {
            width: S.endPos,
            length: S.endChar,
            dispLen: S.startChar,
            dispWidth: S.startPos,
            dispMinWidth: S.startPos
          });
          Object.assign(a, { curRun: S.rtRunIndex, curChar: S.endChar + S.rtRunChar, curPos: S.endPos + S.rtRunPos });
        } else if (!n) {
          n = {
            width: 0,
            height: e[d].runRT.metrics.height,
            start: e[d].startIndex + D,
            length: 0,
            dispStart: e[d].startIndex + D,
            dispLen: 0,
            dispWidth: 0,
            dispMinWidth: 0,
            space: e[d].runRT.metrics.width,
            ascent: e[d].runRT.metrics.ascent,
            descent: e[d].runRT.metrics.descent,
            extraYOffset: e[d].runRT.metrics.extraYOffset,
            isTab: e[d].isTab,
            style: e[d].runRT.style,
            source: { runElem: e[d].runElem, cache: e[d].cache, startRunChar: D, startRunPos: g }
          };

          let l = 0;
          while (D < e[d].nChars && l < p) {
            l = SDGraphics.Text.Formatter.GetRunPositionForChar(e[d].runElem.node, D, !1, e[d].cache) - g;
            if (l <= p || !i.runs.length && !n.length) {
              Object.assign(n, { width: l, dispWidth: l, dispMinWidth: l, length: n.length + 1, dispLen: n.dispLen + 1 });
              D++;
              a.curChar++;
              a.curPos = g + l;
            }
          }
          if (n.length) i.runs.push(n);
        }
      }
    } else if (e.length > 0 && !i.runs.length && m) {
      const o = e[0];
      const n = {
        width: 0,
        height: o.runRT.metrics.height,
        start: o.startIndex,
        length: 0,
        dispStart: o.startIndex,
        dispLen: 0,
        dispWidth: 0,
        dispMinWidth: 0,
        space: o.runRT.metrics.width,
        ascent: o.runRT.metrics.ascent,
        descent: o.runRT.metrics.descent,
        extraYOffset: o.runRT.metrics.extraYOffset,
        isTab: o.isTab,
        style: o.runRT.style,
        source: { runElem: o.runElem, cache: o.cache, startRunChar: 0, startRunPos: 0 }
      };
      if (o.hasCR) n.length++;
      i.runs.push(n);
    }

    i.nextRunInfo = a;
    return i;
  }

  IsDataFieldInRange(e: number, t: number): boolean {
    if (!this.HasDataFields()) return false;
    for (let a = e; a <= t; a++) {
      if (this.IsDataFieldAtPos(a)) return true;
    }
    return false;
  }

  BuildRuntimeRuns = (e, t) => {
    var a, r, i, n, o, s, l, S, c, u, p, d, D = [], g = this.DefaultPStyle();
    for (t = t || [],
      i = e.text.length,
      D.push(0),
      a = 0; a < i; a++)
      "\n" === e.text[a] && D.push(a + 1);
    if (e.styleRuns = [],
      e.spErrors = [],
      e.dataFields = [],
      this.parent.doc)
      for (a = 0; a < D.length; a++) {
        if (n = D[a],
          o = a < D.length - 1 ? D[a + 1] - n : i - n,
          (S = e.styleRuns.length) < t.length && (g = t[S].pStyle),
          l = {
            pStyle: Utils.CopyObj(g),
            runs: [],
            start: n,
            nChars: o
          },
          this.renderingEnabled)
          if (o)
            for (p = null,
              c = null,
              u = null,
              r = n; r < n + o; r++)
              d = this.GetFormatAtOffset(r, e),
                p && this.MatchStylesNoSpell(d.style, p.style) ? s.nChars++ : ((s = {
                  style: d.id,
                  start: r,
                  nChars: 1
                }).metrics = new Formatter().CalcStyleMetrics(d.style, this.parent.doc),
                  l.runs.push(s)),
                p = d,
                d.style.spError ? c ? c.nChars++ : (c = {
                  startIndex: r,
                  nChars: 1
                },
                  e.spErrors.push(c)) : c = null,
                d.style.dataField ? u && u.fieldID == d.style.dataField ? u.nChars++ : (u = {
                  fieldID: d.style.dataField,
                  startIndex: r,
                  nChars: 1
                },
                  e.dataFields.push(u)) : u = null;
          else
            (s = {
              style: (d = this.GetFormatAtOffset(n, e)).id,
              start: n,
              nChars: 0
            }).metrics = new Formatter().CalcStyleMetrics(d.style, this.parent.doc),
              l.runs.push(s);
        else
          this.deferredRenderNeeded = !0;
        e.styleRuns.push(l)
      }
  }

  MatchStylesNoSpell = function (e, t) {
    return e.font === t.font && e.type === t.type && e.size === t.size && e.weight === t.weight && e.style === t.style && e.baseOffset === t.baseOffset && e.decoration === t.decoration && e.color === t.color && e.colorTrans === t.colorTrans && e.dataField === t.dataField && e.hyperlink === t.hyperlink
  }

  SetRenderingEnabled(e: boolean) {
    this.renderingEnabled = e;
    if (e && this.deferredRenderNeeded) {
      const styleRuns = this.rtData.styleRuns.map(run => ({ pStyle: Utils.CopyObj(run.pStyle) }));
      this.BuildRuntimeRuns(this.rtData, styleRuns);
      this.fmtText = this.CalcFromRuntime(this.rtData, this.limits);
      this.UpdateSpellCheckFormatting();
      this.deferredRenderNeeded = false;
    }
  }

  SetRuntimeCharFormat(e: number, t: any, a: boolean): number {
    let currentStyle = this.GetFormatAtOffset(e).style;
    currentStyle = this.MergeStyles(t, currentStyle);
    const styleIndex = this.FindAddStyle(currentStyle);
    if (a) {
      this.rtData.charStyles[e] = styleIndex;
    }
    return styleIndex;
  }

  MergeStyles(e: any, t: any) {
    return {
      font: e.font !== undefined ? e.font : t.font,
      type: e.type !== undefined ? e.type : t.type,
      size: e.size !== undefined ? e.size : t.size,
      weight: e.weight !== undefined ? e.weight : t.weight,
      style: e.style !== undefined ? e.style : t.style,
      baseOffset: e.baseOffset !== undefined ? e.baseOffset : t.baseOffset,
      decoration: e.decoration !== undefined ? e.decoration : t.decoration,
      spError: e.spError !== undefined ? e.spError : t.spError,
      color: e.color !== undefined ? e.color : t.color,
      colorTrans: e.colorTrans !== undefined ? e.colorTrans : t.colorTrans,
      dataField: e.dataField !== undefined ? e.dataField : t.dataField,
      hyperlink: e.hyperlink !== undefined ? e.hyperlink : t.hyperlink
    };
  }

  SetFormat(e: any, t?: number, a?: number, r?: boolean): number {
    if (e.size === 0) return -1;

    t = t == null ? 0 : Math.min(t, this.rtData.text.length - 1);
    a = a == null || t + a > this.rtData.text.length ? this.rtData.text.length - t : a;

    if (e.font && !e.type) {
      e.type = this.parent.doc.GetFontType(e.font);
    }

    if (a <= 0) {
      const l = this.SetRuntimeCharFormat(t, e, false);
      if (this.rtData.text.length === 0) {
        const n = this.rtData.styles[l];
        this.rtData.styles = [n];
        return 0;
      }
      return l;
    }

    let S = false;
    for (let i = 0; i < a; i++) {
      const o = i + t;
      if (this.rtData.charStyles[o] !== this.SetRuntimeCharFormat(o, e, true)) {
        S = true;
      }
    }

    if (r || !S) return -1;

    let l = this.rtData.styles.length - 1;
    for (let i = 0; i < this.rtData.charStyles.length; i++) {
      if (i === 0) {
        l = this.rtData.charStyles[i];
      } else if (this.rtData.charStyles[i] !== l) {
        l = -1;
        break;
      }
    }

    if (l >= 0) {
      const n = this.rtData.styles[l];
      this.rtData.styles = [n];
      for (let i = 0; i < this.rtData.charStyles.length; i++) {
        this.rtData.charStyles[i] = 0;
      }
    }

    const s = this.rtData.styleRuns.map((e: any) => ({ pStyle: e.pStyle }));
    this.BuildRuntimeRuns(this.rtData, s);
    this.fmtText = this.CalcFromRuntime(this.rtData, this.limits);
    this.parent.CallEditCallback('select');
    return -1;
  }

  MatchStyles(e: any, t: any): boolean {
    return e.font === t.font &&
      e.type === t.type &&
      e.size === t.size &&
      e.weight === t.weight &&
      e.style === t.style &&
      e.baseOffset === t.baseOffset &&
      e.decoration === t.decoration &&
      e.spError === t.spError &&
      e.color === t.color &&
      e.colorTrans === t.colorTrans &&
      e.dataField === t.dataField &&
      e.hyperlink === t.hyperlink;
  }

  FindAddStyle(e: any, t?: boolean): number {
    if (!e) return 0;

    const existingStyleIndex = this.rtData.styles.findIndex((style: any) => this.MatchStyles(e, style));
    if (existingStyleIndex >= 0) return existingStyleIndex;

    if (!t) {
      this.rtData.styles.push(e);
      return this.rtData.styles.length - 1;
    }

    return -1;
  }

  GetFormatByID(e: number) {
    let style = this.DefaultStyle();
    if (e >= 0 && e < this.rtData.styles.length) {
      style = this.rtData.styles[e];
    }
    return style;
  }

  MergeParagraphInfo(e: any[], t: number, a: number): any[] {
    const s = [];
    let r = this.GetParagraphAtOffset(t);
    let i = this.GetParagraphAtOffset(t + a);

    if (r < 0) {
      r = 0;
      i = 0;
    }

    for (let o = 0; o < r; o++) {
      s.push({ pStyle: Utils.CopyObj(this.rtData.styleRuns[o].pStyle) });
    }

    let n;
    if (r < this.rtData.styleRuns.length) {
      const currentRun = this.rtData.styleRuns[r];
      const isNotExactMatch = !e.length || t !== currentRun.start || a < currentRun.nChars - 1 || (a < currentRun.nChars && r === this.rtData.styleRuns.length - 1);
      if (isNotExactMatch) {
        n = { pStyle: Utils.CopyObj(currentRun.pStyle) };
      }
    }

    if (n === undefined && e.length > 0) {
      n = e[0];
    }

    if (n !== undefined) {
      s.push(n);
    }

    for (let o = 1; o < e.length; o++) {
      s.push(e[o]);
    }

    for (let o = i + 1; o < this.rtData.styleRuns.length; o++) {
      s.push({ pStyle: Utils.CopyObj(this.rtData.styleRuns[o].pStyle) });
    }

    return s;
  }

  GetParagraphAtOffset(e: number): number {
    for (let t = 0; t < this.rtData.styleRuns.length; t++) {
      if (e < this.rtData.styleRuns[t].start + this.rtData.styleRuns[t].nChars) {
        return t;
      }
    }
    return this.rtData.styleRuns.length - 1;
  }

  GetTextParagraphCount(e: string): number {
    const matches = e.match(/\n/g);
    return matches ? matches.length + 1 : 1;
  }

  GetFormatAtOffset(e: number, t?: any) {
    let a = 0;
    let r = this.DefaultStyle();
    t = t || this.rtData;

    if (e >= t.charStyles.length) {
      e = t.charStyles.length - 1;
    }

    if (e < 0) {
      e = 0;
    }

    if (e < t.charStyles.length) {
      a = t.charStyles[e];
      if (a < t.styles.length) {
        r = t.styles[a];
      }
    } else if (t.styles.length > 0) {
      a = t.styles.length - 1;
      r = t.styles[a];
    }

    return {
      id: a,
      style: r
    };
  }

  CreateTextRunElem = (text, style, doc, disableLinks, fieldStyle) => {
    const tspan = new SVG.Container(SVG.create("tspan"));
    let content = String(text).replace(/\n/g, "") || ".";
    tspan.node.textContent = content.replace(/ /g, " ");
    tspan.attr("xml:space", "preserve");
    tspan.attr("text-rendering", "optimizeSpeed");

    let { color, weight, style: fontStyle, decoration, hyperlink } = style;
    let scaleFactor = 1;

    if (fieldStyle) {
      if (fieldStyle.textColor) color = fieldStyle.textColor;
      if (fieldStyle._curFieldStyle) {
        fieldStyle._curFieldStyle.forEach(({ name, val }) => {
          switch (name) {
            case "color":
              color = val;
              break;
            case "font-weight":
              weight = val;
              break;
            case "font-style":
              fontStyle = val;
              break;
            case "text-decoration":
              if (val === "underline") {
                fieldStyle._curFieldDecoration = val;
                decoration = null;
              } else {
                decoration = val;
              }
              break;
          }
        });
      }
    }

    if (style) {
      if (["sub", "super"].includes(style.baseOffset)) {
        scaleFactor = 0.8;
      }

      Object.entries(style).forEach(([key, value]) => {
        switch (key) {
          case "font":
            if (!style.mappedFont) {
              style.mappedFont = null;// doc.MapFont(style.font, style.type);
            }
            // document.getElementById(tspan.node).setAttribute("font-family", style.mappedFont);
            break;
          case "size":
            if (!isNaN(value)) {
              tspan.attr("font-size", value * scaleFactor);
            }
            break;
          case "weight":
            tspan.attr("font-weight", weight);
            break;
          case "style":
            tspan.attr("font-style", fontStyle);
            break;
          case "decoration":
            if (decoration) {
              tspan.attr("text-decoration", decoration);
            }
            break;
          case "color":
            if (!(hyperlink >= 0 && !disableLinks)) {
              tspan.attr("fill", color);
            }
            break;
          case "colorTrans":
            tspan.attr("opacity", value);
            break;
        }
      });

      if (hyperlink >= 0 && !disableLinks) {
        tspan.attr("fill", "#0000FF");
      }
    }

    return tspan;
  }

  CalcStyleMetrics = (style, doc) => {
    const metrics = {};
    const textContainer = new SVG.Container(SVG.create("text"));
    textContainer.attr("xml:space", "preserve");
    textContainer.attr("text-anchor", "start");

    const textRunElem = this.CreateTextRunElem(" .", style, doc, false, null);
    textContainer.add(textRunElem);
    textContainer.attr("fill-opacity", 0);

    const formattingLayer = doc.GetFormattingLayer();
    formattingLayer.svgObj.add(textContainer);

    const charExtent = textContainer.node.getExtentOfChar(0);
    formattingLayer.svgObj.remove(textContainer);

    metrics.height = charExtent.height;
    metrics.width = charExtent.width;
    metrics.ascent = -charExtent.y;
    metrics.descent = metrics.height - metrics.ascent;
    metrics.extraYOffset = 0;

    if (style) {
      const isSubscript = style.baseOffset === "sub";
      const isSuperscript = style.baseOffset === "super";

      if (isSubscript || isSuperscript) {
        const baseStyle = { ...style, baseOffset: undefined };
        const baseMetrics = doc.CalcStyleMetrics(baseStyle);

        if (isSuperscript) {
          const offset = (baseMetrics.ascent / 2) + metrics.ascent + baseMetrics.descent;
          if (offset > baseMetrics.height) baseMetrics.height = offset;

          metrics.height = baseMetrics.height;
          metrics.ascent = baseMetrics.height - baseMetrics.descent;
          metrics.descent = baseMetrics.descent;
          metrics.extraYOffset = -(baseMetrics.ascent / 2);
        } else {
          const offset = metrics.ascent / 2;
          if (baseMetrics.descent < metrics.descent + offset) baseMetrics.descent = metrics.descent + offset;

          metrics.height = baseMetrics.ascent + baseMetrics.descent;
          metrics.ascent = baseMetrics.ascent;
          metrics.descent = baseMetrics.descent;
          metrics.extraYOffset = offset;
        }
      }
    }

    return metrics;
  }


  RenderFormattedText = function (e, t) {
    "use strict";
    var a, r, i, n, o, s, l, S, c, u, p, d, D = [], g = [], h = e.parent;
    if (h) {
      d = e.position();
      h.remove(e);
    }
    e.clear();
    e.attr("xml:space", "preserve");
    this.renderedLines = [];
    this.renderedDataFields = [];
    t.clear();

    this.fmtText.paragraphs.forEach((d, h) => {
      s = null;
      if (d.pStyle.bullet !== "none" && d.bindent) {
        s = {
          bullet: d.pStyle.bullet,
          xPos: 0,
          yPos: d.yOffset,
          indent: d.bindent,
          height: d.height,
          ascent: d.height / 2,
          hasText: !1,
          style: this.GetBulletStyle(h)
        };
      }

      d.lines.forEach((t, m) => {
        i = 0;
        n = t.width + d.bindent;
        l = this.fmtText.fmtWidth - (t.indent + d.pStyle.rindent);

        switch (d.pStyle.just) {
          case "center":
            i = (l - n) / 2;
            break;
          case "right":
            i = l - n;
        }

        i += t.indent;
        if (s && m === 0) {
          s.xPos = i;
          s.yPos = t.yOffset;
          s.ascent = t.ascent;
        }
        i += t.bindent;

        o = {
          paraIndex: h,
          lineIndex: m,
          lineRec: t,
          left: i,
          right: i,
          top: t.yOffset,
          bottom: t.yOffset + t.height,
          dispStart: t.start,
          pStyle: d.pStyle,
          runs: []
        };

        t.spErrors.forEach(spError => {
          g.push({
            x: i + spError.startPos,
            y: t.yOffset + t.ascent,
            width: spError.endPos - spError.startPos
          });
        });

        t.dataFields.forEach(dataField => {
          this.renderedDataFields.push({
            x: i + dataField.startPos,
            y: t.yOffset,
            width: dataField.endPos - dataField.startPos,
            height: t.height,
            fieldID: dataField.fieldID
          });
        });

        t.runs.forEach((n, l) => {
          s && (s.hasText = n.width > 0);
          u = null;
          p = null;
          a = this.fmtText.styles[n.style];
          r = this.fmtText.text.substr(n.dispStart, n.dispLen);
          var c = !1;
          var d = this.parent.dataStyleOverride || {};
          d._curFieldDecoration = null;
          d._curFieldStyle = null;

          if (n.dispLen > 0 && !n.isTab) {
            if (a.dataField) {
              d._curFieldStyle = this.parent.GetDataStyle(a.dataField);
            }
            u = SDGraphics.Text.Formatter.CreateTextRunElem(r, a, this.parent.doc, this.parent.linksDisabled, d);
            u.attr("x", SDGraphics.Global.RoundCoord(i));
            u.attr("text-anchor", "start");
            u.attr("y", SDGraphics.Global.RoundCoord(t.yOffset + t.ascent + n.extraYOffset));
            u.attr("textLength", n.dispWidth);
            if (!this.parent.linksDisabled) {
              this.AttachHyperlinkToRun(u, a) || (a.hyperlink = -1);
              c = a.hyperlink >= 0;
            }
            e.add(u);

            //
            p = null;//this.parent.doc.GetTextRunCache(a, r);
          }

          if ((d._curFieldDecoration || a.decoration) === "underline" || c) {
            if (n.extraYOffset <= 0) {
              S = c ? "#0000FF" : a.color;
              D.push({
                x: i,
                y: t.yOffset + t.ascent,
                width: n.width,
                color: S
              });
            }
          }

          if (!o.runs.length) {
            o.dispStart = n.dispStart;
          }

          o.runs.push({
            runIndex: l,
            runRec: n,
            left: i,
            right: i + n.width,
            isTab: n.isTab,
            elem: u,
            cache: p
          });

          i += n.width;
        });

        o.right = i;
        this.renderedLines.push(o);
      });

      if (s && s.hasText) {
        this.RenderBullet(s, t);
      }
    });

    D.forEach(underline => {
      this.RenderUnderline(underline, t);
    });

    if (this.SpellCheckValid()) {
      g.forEach(spellError => {
        this.RenderSpellError(spellError, t);
      });
    }

    if (this.parent?.IsActive()) {
      this.RenderDataFieldHilites(t);
    }

    if (h) {
      h.add(e, d);
    }
  }

  SetHyperlinkCursor = () => {
    this.renderedLines.forEach(line => {
      line.runs.forEach(run => {
        const styleIndex = run.runRec.style;
        if (this.rtData.styles[styleIndex].hyperlink >= 0) {
          const element = run.elem;
          if (element) {
            element.node.setAttribute("class", CursorType.POINTER);
          }
        }
      });
    });
  }
}

class Edit {
  public parent: any;
  public isActive: boolean;
  public selStart: number;
  public selEnd: number;
  public selAnchor: number;
  public inActiveSel: any;
  public activeSelPos: number;
  public cursorPos: number;
  public cursorLine: any;
  public curHit: any;
  public lastClickTime: number;
  public inWordSelect: boolean;
  public anchorWord: any;
  public savedCursorState: any;
  public TableDrag: boolean;
  public textEntryField: any;
  public inputFocusTimer: any;
  public textEntrySelStart: number;
  public textEntrySelEnd: number;

  constructor(e) {
    this.parent = e;
    this.isActive = false;
    this.selStart = -1;
    this.selEnd = -1;
    this.selAnchor = -1;
    this.inActiveSel = null;
    this.activeSelPos = -1;
    this.cursorPos = -1;
    this.cursorLine = undefined;
    this.curHit = null;
    this.lastClickTime = 0;
    this.inWordSelect = false;
    this.anchorWord = null;
    this.savedCursorState = this.parent.cursorState;
    this.TableDrag = false;
  }

  IsActive = () => {
    return this.isActive
  }

  ClearSelection() {
    this.selStart = -1;
    this.selEnd = -1;
    this.selAnchor = -1;
    this.UpdateSelection();
  }

  UpdateSelection() {
    const r = new Path().Creator;
    this.DeactivateCursor();

    if (this.selStart < 0 || this.selEnd < 0 || this.selStart === this.selEnd) {
      this.parent.HideSelection();
      return;
    }

    const renderedRange = this.parent.formatter.GetRenderedRange(this.selStart, this.selEnd);
    if (renderedRange.length) {
      renderedRange.forEach(range => {
        r.MoveTo(range.left, range.top);
        r.LineTo(range.right, range.top);
        r.LineTo(range.right, range.bottom);
        r.LineTo(range.left, range.bottom);
        r.ClosePath();
      });
      this.parent.ShowSelection(r.ToString());
    } else {
      this.parent.HideSelection();
    }
  }

  DeactivateCursor() {
    this.parent.HideInputCursor();
    this.cursorPos = -1;
    this.cursorLine = undefined;
  }


  UpdateTextEntryField(e: boolean) {
    if (this.isActive && this.textEntryField && this.textEntryField[0] !== undefined) {
      const t = this.textEntryField[0];
      this.ResetTextEntry();
      if (!e && t.value !== this.parent.formatter.rtData.text) {
        this.textEntryField.val(this.parent.formatter.rtData.text);
      }
      const a = t.value.length;
      const r = Math.min(Math.max(this.selStart, 0), a);
      const i = Math.min(Math.max(this.selEnd, r), a);
      if (t.selectionStart !== r || t.selectionEnd !== i) {
        this.SetInputSelection(t, r, i);
      }
      this.textEntrySelStart = r;
      this.textEntrySelEnd = i;
    }
  }

  SetInputSelection(e: HTMLInputElement, start: number, end: number) {
    e.selectionStart = start;
    e.selectionEnd = end;
  }

  ResetTextEntry() {
    if (this.isActive && this.textEntryField && this.textEntryField.css('visibility') !== 'hidden') {
      if (this.inputFocusTimer == null) {
        this.inputFocusTimer = setInterval(() => this.ResetTextEntry(), 10);
      }
      if (!this.textEntryField.is(':focus')) {
        const activeElement = document.activeElement;
        // if (
        //   activeElement == null ||
        //   activeElement === document.body ||
        //   activeElement === window ||
        //   activeElement === document ||
        //   activeElement === $('#_clipboardInput')[0] ||
        //   activeElement === $('#_IEclipboardDiv')[0]
        // ) {
        //   this.textEntryField.focus();
        // }
      }
    } else if (this.inputFocusTimer != null) {
      clearInterval(this.inputFocusTimer);
      this.inputFocusTimer = undefined;
    }
  }

  SetInsertPos(e: number, t?: any, a?: boolean) {
    this.selStart = e;
    this.selEnd = e;
    this.selAnchor = e;
    this.UpdateSelection();
    this.cursorPos = e;
    this.cursorLine = t ? t.rLine : undefined;
    this.UpdateCursor();
    if (!a) {
      this.UpdateTextEntryField(true);
    }
    this.parent.CallEditCallback("select");
  }

  UpdateCursor() {
    if (this.cursorPos < 0) {
      this.DeactivateCursor();
    } else {
      const charInfo = this.parent.formatter.GetRenderedCharInfo(this.cursorPos, this.cursorLine);
      this.parent.ShowInputCursor(charInfo.left, charInfo.top, charInfo.bottom);
    }
  }
}

class Text extends Element {
  public formatter: Formatter;
  public editor: Edit;
  public svgObj: any;
  public textElem: any;
  public selectElem: Path;
  public cursorElem: any;
  public clickAreaElem: Rect;
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
  public lastFmtSize: { width: number; height: number; };

  CreateElement = (e, t) => {

    console.log('AAAAAAAAAAAA Text CreateElement', e, t);
    this.formatter = new Formatter(this);
    this.editor = new Edit(this);
    this.svgObj = new SVG.Container(SVG.create('g'));
    this.InitElement(e, t);
    this.textElem = new SVG.Container(SVG.create('text'));
    this.selectElem = new SVG.Path();
    this.cursorElem = new SVG.Line();
    this.clickAreaElem = new SVG.Rect();
    this.decorationAreaElem = new SVG.Container(SVG.create('g'));
    this.cursorTimer = undefined;
    this.cursorPos = undefined;
    this.cursorState = CursorState.LINKONLY;

    console.log('this.textElem', this.clickAreaElem);

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
    this.textElemOffset = 0;
    this.activeEditStyle = -1;
    this.selectHidden = false;
    this.linksDisabled = false;
    this.editCallback = null;
    this.editCallbackData = null;
    this.dataTableID = -1;
    this.dataRecordID = -1;
    this.dataStyleOverride = null;
    this.lastFmtSize = { width: 0, height: 0 };

    this.SetText('');
    return this.svgObj;
  }

  SetText(e: string, t?: number, a?: number, r?: any, i?: boolean) {
    const startPos = a || 0;
    const textLength = e.length;

    if (this.editor.IsActive()) {
      this.editor.ClearSelection();
    }

    if (!t && this.activeEditStyle >= 0) {
      t = this.activeEditStyle;
    }

    this.activeEditStyle = -1;
    this.formatter.SetText(e, t, a, r);
    this.UpdateTextObject();

    if (this.editor.IsActive()) {
      if (i) {
        this.editor.UpdateTextEntryField(false);
      }
      this.editor.SetInsertPos(startPos + textLength, null, i);
    }
  }

  UpdateTextObject = () => {
    const textSize = new Formatter().GetTextFormatSize();
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

      const newSize = { width: textSize.width, height };

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
      this.RefreshPaint(null);
      new Formatter().RenderFormattedText(this.textElem, this.decorationAreaElem);

      if (!this.linksDisabled && (this.cursorState === CursorState.EDITLINK || this.cursorState === CursorState.LINKONLY)) {
        new Formatter().SetHyperlinkCursor();
      }

      if (this.editor.IsActive()) {
        if (this.editor.cursorPos >= 0) {
          this.editor.UpdateCursor();
        } else if (this.editor.selStart >= 0) {
          this.editor.UpdateSelection();
        }
      }

      if (needsResize) {
        this.CallEditCallback("didresize", newSize);
      }

      this.lastFmtSize = newSize;
    }
  }

  CallEditCallback(e: string, t: any) {
    if (this.editCallback) {
      return this.editCallback(e, t, this, this.editCallbackData);
    }
  }
}

export default Text;
