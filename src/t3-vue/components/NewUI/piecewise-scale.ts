/**
 * PiecewiseLinearScale — Chart.js custom scale
 *
 * Compresses large empty value-gaps so every data cluster gets fair visual space.
 * Registered under the id 'piecewise'.
 *
 * PIXEL ALLOCATION per cluster:
 *   Each cluster gets a guaranteed FLOOR (15% of chart height) plus a proportional
 *   bonus based on its value-range.  This ensures a tiny cluster like "0–5" and a
 *   tight cluster like "4600–4700" both get enough pixels to be readable, even when
 *   a third cluster spans "25000–26000" (a much larger value range).
 *
 * Each axis stores cluster definitions in scale.options._pwClusters
 *   Array<{ vMin: number; vMax: number }>
 * set during afterDataLimits.  Falls back to standard linear when only 1 cluster.
 */
import Chart from 'chart.js/auto'

type Seg = { vMin: number; vMax: number; pTop: number; pBottom: number }
type Cluster = { vMin: number; vMax: number }

const SCALE_ID = 'piecewise'
if (!(Chart as any).registry?.scales?.get(SCALE_ID)) {
  const LinearScale = (Chart as any).registry?.scales?.get('linear')

  if (LinearScale) {
    class PiecewiseLinearScale extends LinearScale {
      static id = SCALE_ID
      static defaults = {}

      /** Compute pixel-mapped segments from cluster definitions. */
      _getSegs(this: any): Seg[] {
        const clusters: Cluster[] = this.options._pwClusters
        if (!clusters || clusters.length <= 1) return []

        const n = clusters.length
        const GAP_FRAC = 0.03
        const gapCount = n - 1
        const totalPx = this.bottom - this.top
        if (totalPx <= 0) return []

        // WEIGHTED HEIGHT: clusters are weighted by log(distinctValues + 1).
        // A flatline cluster (1 unique value) scores log(2)≈0.69 → tiny band.
        // A 7-line spread cluster scores log(8)≈2.08 → large band.
        // This gives the flatline the minimum space it needs while expanding
        // the real-data clusters so individual lines are clearly readable.
        //
        // _pwDistinct is set by afterDataLimits alongside _pwClusters:
        //   Array<number>  — count of distinct data values per cluster.
        // Falls back to equal weight if not provided.
        const distinct: number[] = this.options._pwDistinct ?? clusters.map(() => 5)
        const weights = distinct.map(d => Math.log(Math.max(d, 1) + 1))
        const totalWeight = weights.reduce((s, w) => s + w, 0)
        const availFrac = 1 - gapCount * GAP_FRAC

        // --- build segments bottom→top (canvas: large pixel = low value) ---
        const segs: Seg[] = []
        let pCursor = this.bottom

        for (let i = 0; i < n; i++) {
          const c       = clusters[i]
          const segPx   = (weights[i] / totalWeight) * availFrac * totalPx
          const pBottom = pCursor
          const pTop    = pCursor - segPx
          segs.push({ vMin: c.vMin, vMax: c.vMax, pTop, pBottom })
          pCursor = pTop

          if (i < n - 1) {
            const gapPx = GAP_FRAC * totalPx
            segs.push({
              vMin:    c.vMax,
              vMax:    clusters[i + 1].vMin,
              pTop:    pCursor - gapPx,
              pBottom: pCursor,
            })
            pCursor -= gapPx
          }
        }
        return segs
      }

      getPixelForValue(this: any, value: number): number {
        const segs = this._getSegs()
        if (!segs.length) return LinearScale.prototype.getPixelForValue.call(this, value)
        for (const seg of segs) {
          if (value >= seg.vMin && value <= seg.vMax) {
            const t = seg.vMax === seg.vMin
              ? 0
              : (value - seg.vMin) / (seg.vMax - seg.vMin)
            return seg.pBottom - t * (seg.pBottom - seg.pTop)
          }
        }
        // outside all segments — clamp
        return value < segs[0].vMin
          ? segs[0].pBottom
          : segs[segs.length - 1].pTop
      }

      getValueForPixel(this: any, pixel: number): number {
        const segs = this._getSegs()
        if (!segs.length) return LinearScale.prototype.getValueForPixel.call(this, pixel)
        for (const seg of segs) {
          if (pixel >= seg.pTop && pixel <= seg.pBottom) {
            const t = seg.pBottom === seg.pTop
              ? 0
              : (seg.pBottom - pixel) / (seg.pBottom - seg.pTop)
            return seg.vMin + t * (seg.vMax - seg.vMin)
          }
        }
        return LinearScale.prototype.getValueForPixel.call(this, pixel)
      }

      buildTicks(this: any): any[] {
        const clusters: Cluster[] = this.options._pwClusters
        if (!clusters || clusters.length <= 1) return LinearScale.prototype.buildTicks.call(this)

        const STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500,
                       1000, 2000, 5000, 10000, 50000, 100000]
        const TARGET = 5   // ~5 ticks per cluster
        const ticks: Array<{ value: number; major: boolean }> = []
        let minStep = Infinity   // track smallest step → drives callback decimal format

        // _pwDistinct[i] = count of distinct data values in cluster i.
        // If 1 (flatline), we emit exactly one tick at the real data value.
        const distinct: number[] = this.options._pwDistinct ?? clusters.map(() => TARGET)

        for (let ci = 0; ci < clusters.length; ci++) {
          const c = clusters[ci]
          const range = c.vMax - c.vMin

          // Flatline cluster: all data is a single value.
          // The cluster bounds are [realVal - pad, realVal + pad], so midpoint = realVal.
          // Emit ONE tick — avoids showing 0.5 / 0.2 / 0.0 / -0.2 / -0.4 for a zero flatline.
          if (distinct[ci] <= 1 || range < 0.001) {
            const realVal = Math.round(((c.vMin + c.vMax) / 2) * 1e6) / 1e6
            ticks.push({ value: realVal, major: false })
            continue
          }

          const rough = range / TARGET
          const step  = STEPS.find(s => s >= rough) ?? rough
          if (step < minStep) minStep = step

          // boundary ticks
          ticks.push({ value: c.vMin, major: false })
          // interior ticks
          const start = Math.ceil((c.vMin + step * 0.01) / step) * step
          for (let v = start; v < c.vMax - step * 0.01; v += step) {
            ticks.push({ value: Math.round(v * 1e6) / 1e6, major: false })
          }
          ticks.push({ value: c.vMax, major: false })
        }

        // Store the smallest step so the axis ticks.callback knows the right
        // decimal precision (the callback checks stepSize < 1 for decimals).
        if (isFinite(minStep) && this.options.ticks) {
          this.options.ticks.stepSize = minStep
        }

        const seen = new Set<number>()
        this.ticks = ticks.filter(t => {
          const k = Math.round(t.value * 1e6)
          if (seen.has(k)) return false
          seen.add(k)
          return true
        })
        return this.ticks
      }
    }

    ;(Chart as any).register(PiecewiseLinearScale)
  }
}
