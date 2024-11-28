import * as Utils from '../Hvac.Utils';
import HvacSVG from '../Hvac.SVG';

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
    this.limits = {
      minWidth: 0,
      maxWidth: 0
    };
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
    return {
      width: 0,
      height: 0,
      fmtWidth: 0,
      text: '',
      paragraphs: [],
      styles: [],
      hyperlinks: []
    }
  }

  DefaultPStyle = function () {
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

  DefaultRuntimeText = function () {
    return {
      text: '',
      charStyles: [],
      styleRuns: [],
      styles: [
        this.DefaultStyle()
      ],
      hyperlinks: []
    }
  }

  DefaultStyle = function () {
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
      spError: !1,
      dataField: null,
      hyperlink: - 1
    }
  }

  SetText = function (e, t, a, r, i) {
    var n,
      o,
      s,
      l,
      S,
      c,
      u,
      p,
      d,
      D = this.DefaultPStyle(),
      g = [],
      h = !1,
      m = - 1,
      C = '',
      y = '';
    for (
      e = String(e).replace(/(\r\n|\r|\u2028|\u2029)/g, '\n').replace(/([\u0000-\u0008]|[\u000B-\u001F])/g, ''),
      null == a ? a = 0 : (a < 0 || a > this.rtData.text.length) &&
        (a = this.rtData.text.length),
      (null == r || r > this.rtData.text.length - a) &&
      (r = r = this.rtData.text.length - a),
      'number' == typeof t ? n = t : !this.rtData.text.length ||
        a >= this.rtData.text.length - 1 ? (n = Math.max(this.rtData.styles.length - 1, 0), h = !0) : r > 0 ? (
          n = this.GetFormatAtOffset(a).id,
          m = this.GetFormatAtOffset(a + r).id
        ) : (
        n = this.GetFormatAtOffset(a - 1).id,
        m = this.GetFormatAtOffset(a).id
      ),
      0 === a &&
      (h = !0),
      m < 0 &&
      (m = n),
      S = this.GetTextParagraphCount(e),
      (l = this.GetParagraphAtOffset(a)) >= 0 &&
      (D = this.rtData.styleRuns[l].pStyle),
      d = 0;
      d < S;
      d++
    ) g.push({
      pStyle: Utils.CopyObj(D)
    });
    if (
      g = this.MergeParagraphInfo(g, a, r),
      a === this.rtData.text.length ? s = this.rtData.text + e : (
        a > 0 &&
        (C = this.rtData.text.slice(0, a)),
        a + r < this.rtData.text.length &&
        (y = this.rtData.text.slice(a + r)),
        s = C + e + y
      ),
      i ||
      !1 !== this.parent.CallEditCallback('onbeforeinsert', s)
    ) {
      if (
        this.rtData.text = s,
        this.contentVersion++,
        this.rtData.styles.length ||
        (
          this.rtData.styles = [
            this.DefaultStyle()
          ]
        ),
        c = this.GetFormatByID(n),
        u = this.GetFormatByID(m),
        c.hyperlink !== u.hyperlink &&
        (h = !0),
        (c.dataField || h) &&
        (
          (c = Utils.CopyObj(c)).dataField = null,
          h &&
          (c.hyperlink = - 1),
          n = this.FindAddStyle(c)
        ),
        e.length
      ) {
        for (o = new Array(e.length), d = 0; d < e.length; d++) o[d] = n;
        this.rtData.charStyles.splice.apply(this.rtData.charStyles, [
          a,
          r
        ].concat(o)),
          t &&
          'object' == typeof t &&
          this.SetFormat(t, a, e.length)
      } else r &&
        (
          this.rtData.charStyles.splice(a, r),
          this.rtData.text.length ||
          (
            t &&
            'object' == typeof t &&
            (t.hyperlink = - 1, t.dataField = null, n = this.SetFormat(t, 0, 0)),
            t = this.GetFormatByID(n),
            this.rtData.styles = [
              Utils.CopyObj(t)
            ]
          )
        );
      (p = this.renderingEnabled) &&
        this.SetRenderingEnabled(!1),
        this.BuildRuntimeRuns(this.rtData, g),
        this.AdjustSpellCheck(e),
        p &&
        this.SetRenderingEnabled(!0)
    }
  }

  GetTextParagraphCount = function (e) {
    var t = e.match(/\n/g),
      a = 1;
    return t &&
      (a += t.length),
      a
  }

  GetParagraphAtOffset = function (e) {
    var t;
    for (t = 0; t < this.rtData.styleRuns.length; t++) if (
      e < this.rtData.styleRuns[t].start + this.rtData.styleRuns[t].nChars
    ) return t;
    return this.rtData.styleRuns.length - 1
  }

  MergeParagraphInfo = function (e, t, a) {
    var r,
      i,
      n,
      o,
      s = [];
    for (
      r = this.GetParagraphAtOffset(t),
      i = this.GetParagraphAtOffset(t + a),
      r < 0 &&
      (r = 0, i = 0),
      o = 0;
      o < r;
      o++
    ) s.push({
      pStyle: Utils.CopyObj(this.rtData.styleRuns[o].pStyle)
    });
    for (
      r < this.rtData.styleRuns.length &&
      (
        !e.length ||
        t != this.rtData.styleRuns[r].start ||
        a < this.rtData.styleRuns[r].nChars - 1 ||
        a < this.rtData.styleRuns[r].nChars &&
        r === this.rtData.styleRuns.length - 1
      ) &&
      (
        n = {
          pStyle: Utils.CopyObj(this.rtData.styleRuns[r].pStyle)
        }
      ),
      void 0 === n &&
      e.length > 0 &&
      (n = e[0]),
      void 0 !== n &&
      s.push(n),
      o = 1;
      o < e.length;
      o++
    ) s.push(e[o]);
    for (o = i + 1; o < this.rtData.styleRuns.length; o++) s.push({
      pStyle: Utils.CopyObj(this.rtData.styleRuns[o].pStyle)
    });
    return s
  }

  GetFormatByID = function (e) {
    var t = this.DefaultStyle();
    return e >= 0 &&
      e < this.rtData.styles.length &&
      (t = this.rtData.styles[e]),
      t
  }

  FindAddStyle = function (e, t) {
    var a,
      r = this.rtData.styles.length,
      i = - 1;
    if (!e) return 0;
    for (a = 0; a < r; a++) if (this.MatchStyles(e, this.rtData.styles[a])) {
      i = a;
      break
    }
    return i < 0 &&
      !t &&
      (this.rtData.styles.push(e), i = r),
      i
  }

  MatchStyles = function (e, t) {
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
      e.hyperlink === t.hyperlink
  }

  SetRenderingEnabled = function (e) {
    var t,
      a = [];
    if (this.renderingEnabled = e, e && this.deferredRenderNeeded) {
      for (t = 0; t < this.rtData.styleRuns.length; t++) a.push({
        pStyle: Utils.CopyObj(this.rtData.styleRuns[t].pStyle)
      });
      this.BuildRuntimeRuns(this.rtData, a),
        this.fmtText = this.CalcFromRuntime(this.rtData, this.limits),
        this.UpdateSpellCheckFormatting(),
        this.deferredRenderNeeded = !1
    }
  }

  BuildRuntimeRuns = function (e, t) {
    'use strict';
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
      D = [],
      g = this.DefaultPStyle();
    for (t = t || [], i = e.text.length, D.push(0), a = 0; a < i; a++) '\n' === e.text[a] &&
      D.push(a + 1);
    if (e.styleRuns = [], e.spErrors = [], e.dataFields = [], this.parent.doc) for (a = 0; a < D.length; a++) {
      if (
        n = D[a],
        o = a < D.length - 1 ? D[a + 1] - n : i - n,
        (S = e.styleRuns.length) < t.length &&
        (g = t[S].pStyle),
        l = {
          pStyle: Utils.CopyObj(g),
          runs: [],
          start: n,
          nChars: o
        },
        this.renderingEnabled
      ) if (o) for (p = null, c = null, u = null, r = n; r < n + o; r++) d = this.GetFormatAtOffset(r, e),
        p &&
          this.MatchStylesNoSpell(d.style, p.style) ? s.nChars++ : (
          (s = {
            style: d.id,
            start: r,
            nChars: 1
          }).metrics = this.parent.doc.CalcStyleMetrics(d.style),
          l.runs.push(s)
        ),
        p = d,
        d.style.spError ? c ? c.nChars++ : (c = {
          startIndex: r,
          nChars: 1
        }, e.spErrors.push(c)) : c = null,
        d.style.dataField ? u &&
          u.fieldID == d.style.dataField ? u.nChars++ : (
          u = {
            fieldID: d.style.dataField,
            startIndex: r,
            nChars: 1
          },
          e.dataFields.push(u)
        ) : u = null;
        else (
          s = {
            style: (d = this.GetFormatAtOffset(n, e)).id,
            start: n,
            nChars: 0
          }
        ).metrics = this.parent.doc.CalcStyleMetrics(d.style),
          l.runs.push(s);
      else this.deferredRenderNeeded = !0;
      e.styleRuns.push(l)
    }
  }

  AdjustSpellCheck = function (e) {
    var t,
      a,
      r = e &&
        1 == e.length &&
        e.search(
          /[^\u0000-\u2FFF]|[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u0386-\u04FF\u1E00-\u1FFF]/
        ) >= 0,
      i = !1;
    if (this.SpellCheckValid() && this.parent.IsActive()) {
      if (a = this.GetWordList(), !r) for (t = 0; t < a.list.length; t++) a.list[t].status == SDGraphics.Text.Spell.WordState.NOTPROCESSED &&
        (i = !0);
      i ? this.parent.DoSpellCheck() : this.UpdateSpellCheckFormatting()
    } else this.wordList = null
  }

  SpellCheckValid = function () {
    return this.spellCheckEnabled &&
      this.parent.doc.spellChecker &&
      this.parent.doc.spellChecker.GetActive() &&
      this.parent.IsActive()
  }

  GetFormatAtOffset = function (e, t) {
    var a = 0,
      r = this.DefaultStyle();
    return e >= (t = t || this.rtData).charStyles.length &&
      (e = t.charStyles.length - 1),
      e < 0 &&
      (e = 0),
      e < t.charStyles.length ? (a = t.charStyles[e]) < t.styles.length &&
        (r = t.styles[a]) : t.styles.length > 0 &&
      (a = t.styles.length - 1, r = t.styles[a]),
    {
      id: a,
      style: r
    }
  }

  CalcStyleMetrics = function (e, t) {
    var a,
      r,
      i,
      n,
      o,
      s,
      l = null,
      S = {},
      c = !1,
      u = !1,
      p = new HvacSVG.Container(HvacSVG.create('text'));
    return p.attr('xml:space', 'preserve'),
      p.attr('text-anchor', 'start'),
      a = this.CreateTextRunElem(' .', e, t, !1, null),
      p.add(a),
      p.attr('fill-opacity', 0),
      (i = t.GetFormattingLayer()).svgObj.add(p),
      r = p.node.getExtentOfChar(0),
      i.svgObj.remove(p),
      S.height = r.height,
      S.width = r.width,
      S.ascent = - r.y,
      S.descent = S.height - S.ascent,
      S.extraYOffset = 0,
      e &&
      (c = 'sub' == e.baseOffset, u = 'super' == e.baseOffset),
      (c || u) &&
      (
        (n = Utils.CopyObj(e)).baseOffset = void 0,
        l = t.CalcStyleMetrics(n),
        u ? (
          (s = (o = l.ascent / 2) + S.ascent + l.descent) > l.height &&
          (l.height = s),
          S.height = l.height,
          S.ascent = l.height - l.descent,
          S.descent = l.descent,
          S.extraYOffset = - o
        ) : (
          o = S.ascent / 2,
          l.descent < S.descent + o &&
          (l.descent = S.descent + o),
          S.height = l.ascent + l.descent,
          S.ascent = l.ascent,
          S.descent = l.descent,
          S.extraYOffset = o
        )
      ),
      S
  }

  MakeIDFromStyle = function (e) {
    return (e.font + '_' + e.size + '_' + e.weight + '_' + e.style + '_' + e.baseOffset).replace(/ /g, '')
  }

  CreateTextRunElem = function (e, t, a, r, n) {
    var o,
      s = new HvacSVG.Container(HvacSVG.create('tspan')),
      l = String(e).replace(/\n/g, ''),
      S = 1;
    l.length ||
      (l = '.'),
      s.node.textContent = l.replace(/ /g, ' '),
      s.attr('xml:space', 'preserve'),
      s.attr('text-rendering', 'optimizeSpeed');
    var c = t.color,
      u = t.weight,
      p = t.style,
      d = t.decoration,
      D = t.hyperlink >= 0;
    if (n && (n.textColor && (c = n.textColor), n._curFieldStyle)) {
      var g = n._curFieldStyle;
      for (i = 0; i < g.length; i++) switch (g[i].name) {
        case 'color':
          c = g[i].val;
          break;
        case 'font-weight':
          u = g[i].val;
          break;
        case 'font-style':
          p = g[i].val;
          break;
        case 'text-decoration':
          'underline' == g[i].val ? (n._curFieldDecoration = g[i].val, d = null) : d = g[i].val
      }
    }
    if (t) {
      for (var h in 'sub' != t.baseOffset && 'super' != t.baseOffset || (S = 0.8), t) switch (h) {
        case 'font':
          t.mappedFont ||
            (t.mappedFont = a.MapFont(t.font, t.type)),
            // $(s.node).css('font-family', t.mappedFont);
            document.getElementById(s.node)?.setAttribute('font-family', t.mappedFont);
          break;
        case 'size':
          o = t[h],
            isNaN(o) ||
            (o *= S, s.attr('font-size', o));
          break;
        case 'weight':
          s.attr('font-weight', u);
          break;
        case 'style':
          s.attr('font-style', p);
          break;
        case 'decoration':
          d &&
            s.attr('text-decoration', d);
          break;
        case 'color':
          D &&
            !r ||
            s.attr('fill', c);
          break;
        case 'colorTrans':
          s.attr('opacity', t[h])
      }
      D &&
        !r &&
        s.attr('fill', '#0000FF')
    }
    return s
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
                  (A = new HvacSVG.Container(HvacSVG.create('text'))).attr('xml:space', 'preserve'),
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
    var e = 0,
      t = this.GetBulletPIndex();
    return this.rtData.styleRuns &&
      t < this.rtData.styleRuns.length &&
      this.rtData.styleRuns[t].runs &&
      this.rtData.styleRuns[t].runs.length &&
      (e = this.rtData.styleRuns[t].runs[0].metrics.ascent),
      e
  }

  GetBulletPIndex = function () {
    var e;
    if (this.rtData.styleRuns)
      for (e = 0; e < this.rtData.styleRuns.length; e++)
        if (this.rtData.styleRuns[e].pStyle && this.rtData.styleRuns[e].pStyle.bullet && "none" != this.rtData.styleRuns[e].pStyle.bullet)
          return e;
    return 0
  }

  CalcParagraphRunMetrics = function (e, t, a, r) {
    var i, n, o, s, l, S, c, u, p, d, D, g, h, m, C, y, f, L, I = /(\s+)/g, T = /(\t+)/g;
    for (D = [],
      g = [],
      o = 0; o < t.runs.length; o++) {
      for (S = t.runs[o].start,
        c = t.runs[o].nChars,
        L = t.runs[o].style,
        d = [],
        i = c ? e.text.substr(S, c) : ""; n = T.exec(i);)
        d.push({
          start: n.index,
          end: n.index + n[0].length,
          nChars: n[0].length
        });
      if (d.length)
        for (d[0].start > 0 && g.push({
          start: S,
          nChars: d[0].start,
          style: L,
          metrics: t.runs[o].metrics
        }),
          s = 0; s < d.length; s++)
          g.push({
            start: S + d[s].start,
            nChars: d[s].nChars,
            style: L,
            metrics: t.runs[o].metrics,
            isTab: !0
          }),
            d[s].end < c && (s < d.length - 1 ? g.push({
              start: S + d[s].end,
              nChars: d[s + 1].start - d[s].end,
              style: L,
              metrics: t.runs[o].metrics
            }) : g.push({
              start: S + d[s].end,
              nChars: c - d[s].end,
              style: L,
              metrics: t.runs[o].metrics
            }));
      else
        g.push({
          start: S,
          nChars: c,
          style: L,
          metrics: t.runs[o].metrics
        })
    }
    for (o = 0; o < g.length; o++) {
      for (S = g[o].start,
        c = g[o].nChars,
        L = e.styles[g[o].style],
        (f = c && "\n" === e.text[S + c - 1]) && c--,
        i = c ? e.text.substr(S, c) : "",
        u = []; n = I.exec(i);)
        u.push({
          startIndex: n.index,
          endIndex: n.index + n[0].length,
          startPos: 0,
          endPos: 0
        });
      (h = {}).startIndex = S,
        h.endIndex = S + c,
        h.nChars = c,
        h.style = L,
        h.breaks = u,
        h.str = i,
        h.startDispIndex = 0,
        h.endDispIndex = c,
        h.width = 0,
        h.startDispPos = 0,
        h.endDispPos = 0,
        h.hasCR = f,
        h.runRT = g[o],
        h.style = L,
        h.isTab = !0 === g[o].isTab,
        u.length && h && !L.dataField && (0 === u[0].startIndex && (h.startDispIndex = u[0].endIndex),
          u[u.length - 1].endIndex == c && (h.endDispIndex = u[u.length - 1].startIndex)),
        m = null,
        C = null,
        c && !h.isTab && (i += ".",
          (m = this.CreateTextRunElem(i, L, this.parent.doc, this.parent.linksDisabled, null)).attr("x", 0),
          m.attr("text-anchor", "start"),
          m.attr("y", 0),
          a.add(m),
          C = this.parent.doc.GetTextRunCache(L, i)),
        h.runElem = m,
        h.cache = C,
        D.push(h)
    }
    for (r.svgObj.add(a),
      o = 0; o < D.length; o++)
      if (m = (h = D[o]).runElem)
        for (l = h.endIndex - h.startIndex - 1,
          y = this.GetRunPositionForChar(m.node, l, !1, h.cache),
          h.width = y,
          h.endDispPos = h.width,
          s = 0; s < h.breaks.length; s++)
          (p = h.breaks[s]).startIndex > 0 && (l = p.startIndex,
            y = this.GetRunPositionForChar(m.node, l, !0, h.cache),
            p.startPos = y),
            p.endIndex == h.nChars ? p.endPos = h.width : (l = p.endIndex,
              y = this.GetRunPositionForChar(m.node, l, !0, h.cache),
              p.endPos = y),
            0 !== s || 0 !== p.startIndex || h.style.dataField || (h.startDispPos = p.endPos),
            s != h.breaks.length - 1 || p.endIndex != h.nChars || h.style.dataField || (h.endDispPos = p.startPos);
    return D
  }

  BuildLineForDisplay = function (e, t, a, r) {
    var i, n, o, s, l, S, c, u, p, d = 0, D = 0, g = 0, h = 0, m = !a;
    if (a)
      for (d = a.curRun || 0,
        D = a.curChar || 0,
        g = a.curPos || 0,
        D < e[d].startDispIndex && (D = e[d].startDispIndex),
        g < e[d].startDispPos && (g = e[d].startDispPos),
        a = null; d < e.length && !((o = e[d]).startDispIndex < o.endDispIndex);)
        d++,
          D = 0,
          g = 0;
    for (i = {
      runs: [],
      nextRunInfo: null
    },
      p = t,
      S = {
        runIndex: -1,
        startChar: 0,
        endChar: 0,
        startPos: 0,
        endPos: 0,
        isRunEnd: !1,
        breakRec: null
      }; d < e.length && (o = e[d],
        !((u = Math.max(o.endDispPos - g, 0)) > p));)
      (n = {
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
        source: {
          runElem: o.runElem,
          cache: o.cache,
          startRunChar: D,
          startRunPos: g
        }
      }).isTab && r.tabspace > 0 && (s = h - h % r.tabspace,
        s += r.tabspace * n.length,
        n.width = s - h),
        o.hasCR && n.length++,
        n.width > 0 && ((c = o.breaks.length - 1) >= 0 && o.breaks[c].startIndex >= D && (S.runIndex = i.runs.length,
          S.startChar = o.breaks[c].startIndex - D,
          S.endChar = o.breaks[c].endIndex - D,
          S.startPos = o.breaks[c].startPos - g,
          S.endPos = o.breaks[c].endPos - g,
          S.breakRec = o.breaks[c],
          S.rtRunIndex = d,
          S.rtRunPos = g,
          S.rtRunChar = D,
          S.isRunEnd = o.breaks[c].endIndex == o.nChars),
          i.runs.push(n)),
        p -= n.width,
        h += n.width,
        d++,
        g = 0,
        D = 0;
    if (d < e.length) {
      if (a = {
        curRun: d,
        curChar: D,
        curPos: g
      },
        p > 0) {
        for (c = (o = e[d]).breaks.length - 1,
          n = null; c >= 0 && o.breaks[c].endIndex > D;) {
          if (o.breaks[c].startPos - g <= p) {
            a.curChar = o.breaks[c].endIndex,
              a.curPos = o.breaks[c].endPos,
              n = {
                width: Math.min(a.curPos - g, p),
                height: o.runRT.metrics.height,
                start: o.startIndex + D,
                length: a.curChar - D,
                dispStart: o.startIndex + D,
                dispLen: o.breaks[c].startIndex - D,
                dispWidth: o.breaks[c].startPos - g,
                dispMinWidth: o.breaks[c].startPos - g,
                space: o.runRT.metrics.width,
                ascent: o.runRT.metrics.ascent,
                descent: o.runRT.metrics.descent,
                extraYOffset: o.runRT.metrics.extraYOffset,
                isTab: o.isTab,
                style: o.runRT.style,
                source: {
                  runElem: o.runElem,
                  cache: o.cache,
                  startRunChar: D,
                  startRunPos: g
                }
              },
              i.runs.push(n);
            break
          }
          c--
        }
        if (!n)
          if (S.runIndex >= 0) {
            if (!S.isRunEnd) {
              for (; i.runs.length > S.runIndex + 1;)
                i.runs.pop();
              (n = i.runs[S.runIndex]).width = S.endPos,
                n.length = S.endChar,
                n.dispLen = S.startChar,
                n.dispWidth = S.startPos,
                n.dispMinWidth = S.startPos,
                a.curRun = S.rtRunIndex,
                a.curChar = S.endChar + S.rtRunChar,
                a.curPos = S.endPos + S.rtRunPos
            }
          } else {
            for (n = {
              width: 0,
              height: (o = e[d]).runRT.metrics.height,
              start: o.startIndex + D,
              length: 0,
              dispStart: o.startIndex + D,
              dispLen: 0,
              dispWidth: 0,
              dispMinWidth: 0,
              space: o.runRT.metrics.width,
              ascent: o.runRT.metrics.ascent,
              descent: o.runRT.metrics.descent,
              extraYOffset: o.runRT.metrics.extraYOffset,
              isTab: o.isTab,
              style: o.runRT.style,
              source: {
                runElem: o.runElem,
                cache: o.cache,
                startRunChar: D,
                startRunPos: g
              }
            },
              l = 0; D < o.nChars && l < p;)
              ((l = this.GetRunPositionForChar(o.runElem.node, D, !1, o.cache) - g) <= p || !i.runs.length && !n.length) && (n.width = l,
                n.dispWidth = l,
                n.dispMinWidth = l,
                n.length++,
                n.dispLen++,
                D++,
                a.curChar++,
                a.curPos = g + l);
            n.length && i.runs.push(n)
          }
      }
    } else
      e.length > 0 && !i.runs.length && m && (n = {
        width: 0,
        height: (o = e[0]).runRT.metrics.height,
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
        source: {
          runElem: o.runElem,
          cache: o.cache,
          startRunChar: 0,
          startRunPos: 0
        }
      },
        o.hasCR && n.length++,
        i.runs.push(n));
    return i.nextRunInfo = a,
      i
  }

  UpdateSpellCheckFormatting = function () {
    if (!this.SpellCheckValid())
      return this.SetFormat({
        spError: !1
      }),
        void (this.wordList = null);
    var e, t, a, r = this.GetWordList(), i = r.list.length;
    for (this.SetFormat({
      spError: !1
    }, null, null, !0),
      e = 0; e < i; e++)
      t = r.list[e].start,
        a = r.list[e].end,
        r.list[e].status != 'WRONG' || this.IsDataFieldInRange(t, a) || this.SetFormat({
          spError: !0
        }, t, r.list[e].word.length, !0);
    if (this.renderingEnabled) {
      var n = [];
      for (e = 0; e < this.rtData.styleRuns.length; e++)
        n.push({
          pStyle: Utils.CopyObj(this.rtData.styleRuns[e].pStyle)
        });
      this.BuildRuntimeRuns(this.rtData, n),
        this.fmtText = this.CalcFromRuntime(this.rtData, this.limits)
    }
  }

  SetFormat = function (e, t, a, r) {
    var i,
      n,
      o,
      s = [],
      l = - 1,
      S = !1;
    if (0 === e.size) return - 1;
    if (
      null == t ? t = 0 : t >= this.rtData.text.length &&
        (t = this.rtData.text.length - 1),
      (null == a || t + a > this.rtData.text.length) &&
      (a = this.rtData.text.length - t),
      e.font &&
      !e.type &&
      (e.type = this.parent.doc.GetFontType(e.font)),
      !(a > 0)
    ) return l = this.SetRuntimeCharFormat(t, e, !1),
      this.rtData.text.length ||
      (n = this.rtData.styles[l], this.rtData.styles = [
        n
      ], l = 0),
      l;
    for (i = 0; i < a; i++) o = i + t,
      this.rtData.charStyles[o] != this.SetRuntimeCharFormat(o, e, !0) &&
      (S = !0);
    if (r || !S) return - 1;
    for (
      l = this.rtData.styles.length - 1,
      i = 0;
      i < this.rtData.charStyles.length;
      i++
    ) if (0 === i) l = this.rtData.charStyles[i];
      else if (this.rtData.charStyles[i] != l) {
        l = - 1;
        break
      }
    if (l >= 0) for (
      n = this.rtData.styles[l],
      this.rtData.styles = [
        n
      ],
      i = 0;
      i < this.rtData.charStyles.length;
      i++
    ) this.rtData.charStyles[i] = 0;
    return this.rtData.styleRuns.forEach((function (e) {
      s.push({
        pStyle: e.pStyle
      })
    }), this),
      this.BuildRuntimeRuns(this.rtData, s),
      this.fmtText = this.CalcFromRuntime(this.rtData, this.limits),
      this.parent.CallEditCallback('select'),
      - 1
  }

  SetRuntimeCharFormat = function (e, t, a) {
    var r, i;
    return i = this.GetFormatAtOffset(e).style,
      i = this.MergeStyles(t, i),
      r = this.FindAddStyle(i),
      a && (this.rtData.charStyles[e] = r),
      r
  }

  MergeStyles = function (e, t) {
    return {
      font: void 0 !== e.font ? e.font : t.font,
      type: void 0 !== e.type ? e.type : t.type,
      size: void 0 !== e.size ? e.size : t.size,
      weight: void 0 !== e.weight ? e.weight : t.weight,
      style: void 0 !== e.style ? e.style : t.style,
      baseOffset: void 0 !== e.baseOffset ? e.baseOffset : t.baseOffset,
      decoration: void 0 !== e.decoration ? e.decoration : t.decoration,
      spError: void 0 !== e.spError ? e.spError : t.spError,
      color: void 0 !== e.color ? e.color : t.color,
      colorTrans: void 0 !== e.colorTrans ? e.colorTrans : t.colorTrans,
      dataField: void 0 !== e.dataField ? e.dataField : t.dataField,
      hyperlink: void 0 !== e.hyperlink ? e.hyperlink : t.hyperlink
    }
  }

  GetTextFormatSize = function () {
    var e = Math.max(this.fmtText.width, this.limits.minWidth);
    return this.limits.maxWidth && (e = Math.min(e, this.limits.maxWidth)),
    {
      width: e,
      height: this.fmtText.height
    }
  }

  RenderFormattedText = function (e, t) {
    var a, r, i, n, o, s, l, S, c, u, p, d, D = [], g = [], h = e.parent;
    for (h && (d = e.position(),
      h.remove(e)),
      e.clear(),
      e.attr("xml:space", "preserve"),
      this.renderedLines = [],
      this.renderedDataFields = [],
      t.clear(),
      this.fmtText.paragraphs.forEach((function (d, h) {
        s = null,
          "none" != d.pStyle.bullet && d.bindent && (s = {
            bullet: d.pStyle.bullet,
            xPos: 0,
            yPos: d.yOffset,
            indent: d.bindent,
            height: d.height,
            ascent: d.height / 2,
            hasText: !1,
            style: this.GetBulletStyle(h)
          }),
          d.lines.forEach((function (t, m) {
            switch (i = 0,
            n = t.width + d.bindent,
            l = this.fmtText.fmtWidth - (t.indent + d.pStyle.rindent),
            d.pStyle.just) {
              case "center":
                i = (l - n) / 2;
                break;
              case "right":
                i = l - n
            }
            for (i += t.indent,
              s && 0 === m && (s.xPos = i,
                s.yPos = t.yOffset,
                s.ascent = t.ascent),
              i += t.bindent,
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
              },
              c = 0; c < t.spErrors.length; c++)
              g.push({
                x: i + t.spErrors[c].startPos,
                y: t.yOffset + t.ascent,
                width: t.spErrors[c].endPos - t.spErrors[c].startPos
              });
            for (c = 0; c < t.dataFields.length; c++)
              this.renderedDataFields.push({
                x: i + t.dataFields[c].startPos,
                y: t.yOffset,
                width: t.dataFields[c].endPos - t.dataFields[c].startPos,
                height: t.height,
                fieldID: t.dataFields[c].fieldID
              });
            t.runs.forEach((function (n, l) {
              s && (s.hasText = n.width > 0),
                u = null,
                p = null,
                a = this.fmtText.styles[n.style],
                r = this.fmtText.text.substr(n.dispStart, n.dispLen);
              var c = !1
                , d = this.parent.dataStyleOverride || {};
              d._curFieldDecoration = null,
                d._curFieldStyle = null,
                n.dispLen > 0 && !n.isTab && (a.dataField && (d._curFieldStyle = this.parent.GetDataStyle(a.dataField)),
                  (u = this.CreateTextRunElem(r, a, this.parent.doc, this.parent.linksDisabled, d)).attr("x", Utils.RoundCoord(i)),
                  u.attr("text-anchor", "start"),
                  u.attr("y", Utils.RoundCoord(t.yOffset + t.ascent + n.extraYOffset)),
                  u.attr("textLength", n.dispWidth),
                  this.parent.linksDisabled || (this.AttachHyperlinkToRun(u, a) || (a.hyperlink = -1),
                    c = a.hyperlink >= 0),
                  e.add(u),
                  p = this.parent.doc.GetTextRunCache(a, r)),
                ("underline" == (d._curFieldDecoration || a.decoration) || c) && n.extraYOffset <= 0 && (S = c ? "#0000FF" : a.color,
                  D.push({
                    x: i,
                    y: t.yOffset + t.ascent,
                    width: n.width,
                    color: S
                  })),
                o.runs.length || (o.dispStart = n.dispStart),
                o.runs.push({
                  runIndex: l,
                  runRec: n,
                  left: i,
                  right: i + n.width,
                  isTab: n.isTab,
                  elem: u,
                  cache: p
                }),
                i += n.width
            }
            ), this),
              o.right = i,
              this.renderedLines.push(o)
          }
          ), this),
          s && s.hasText && this.RenderBullet(s, t)
      }
      ), this),
      c = 0; c < D.length; c++)
      this.RenderUnderline(D[c], t);
    if (this.SpellCheckValid())
      for (c = 0; c < g.length; c++)
        this.RenderSpellError(g[c], t);
    this.parent.IsActive() && this.RenderDataFieldHilites(t),
      h && h.add(e, d)
  }

  SetHyperlinkCursor = function () {
    var e, t, a, r;
    for (e = 0; e < this.renderedLines.length; e++)
      for (t = 0; t < this.renderedLines[e].runs.length; t++)
        a = this.renderedLines[e].runs[t].runRec.style,
          this.rtData.styles[a].hyperlink >= 0 && (r = this.renderedLines[e].runs[t].elem) && r.node.setAttribute("class", "cur-pointer")
  }

  GetRunPositionForChar = function (e, t, a, r, i) {
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

  AttachHyperlinkToRun = function (e, t) {
  }

  MatchStylesNoSpell = function (e, t) {
    return e.font === t.font && e.type === t.type && e.size === t.size && e.weight === t.weight && e.style === t.style && e.baseOffset === t.baseOffset && e.decoration === t.decoration && e.color === t.color && e.colorTrans === t.colorTrans && e.dataField === t.dataField && e.hyperlink === t.hyperlink
  }
}

export default Formatter;
