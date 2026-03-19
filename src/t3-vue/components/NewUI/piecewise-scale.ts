/**
 * PiecewiseLinearScale — Chart.js custom scale
 *
 * Compresses large empty value-gaps so every data cluster gets fair visual space.
 * Registered under the id 'piecewise'.
 *
 * PIXEL ALLOCATION per cluster:
 *   Flatline clusters (1 unique value) get a fixed FLAT_PX band.
 *   All other clusters share the remaining pixels equally — every data band
 *   gets the same screen real-estate regardless of its value range.
 *   This maximises px/unit for tight clusters (e.g. 4620–4660) so closely-
 *   spaced lines are visually separated.
 *   A fixed EDGE_PAD_PX buffer is reserved at the top and bottom of each axis
 *   so line strokes at the extreme values are never clipped by the canvas edge.
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

      /** Compute pixel-mapped segments from cluster definitions.
       *
       * PIXEL ALLOCATION — equal height for every spread cluster:
       *   • Flatline clusters (1 unique value) → fixed FLATLINE_PX compact band.
       *   • Spread clusters → equal share of the remaining pixel budget so every
       *     group of similar values (e.g. 4600–4660) gets the same vertical space
       *     as a wide-range cluster (e.g. 49000–51000).  This makes tightly-spaced
       *     lines visually separated instead of squeezed into a tiny band.
       *     A MIN_PX floor ensures every cluster is tall enough to show tick labels.
       *   Constants are adaptive (% of axis height H) so they scale with the canvas.
       */
      _getSegs(this: any): Seg[] {
        const clusters: Cluster[] = this.options._pwClusters
        if (!clusters || clusters.length <= 1) return []

        const n = clusters.length
        const H = this.bottom - this.top

        // Adaptive constants — scale with axis height so small canvases stay usable
        const GAP_PX      = Math.max(6,  Math.min(18, Math.floor(H * 0.025)))
        const FLATLINE_PX = Math.max(20, Math.min(40, Math.floor(H * 0.10)))
        const MIN_PX      = Math.max(30, Math.min(55, Math.floor(H * 0.15)))
        const EDGE_PAD    = 4

        const budget = H - 2 * EDGE_PAD - (n - 1) * GAP_PX
        if (budget <= 0) return []

        const distinct: number[] = this.options._pwDistinct ?? clusters.map(() => 5)
        const isFlat = distinct.map((d: number) => d <= 1)

        const flatCount   = isFlat.filter(Boolean).length
        const spreadCount = n - flatCount
        const flatTotal   = flatCount * FLATLINE_PX
        const spreadBudget = budget - flatTotal

        // Equal allocation: every spread cluster gets the same vertical space
        // regardless of its value range.  A tight cluster (e.g. 4600–4660) gets
        // the same pixels as a wide cluster (e.g. 49000–51000), so closely-spaced
        // lines are visually separated instead of squeezed into a tiny band.
        const equalPx = spreadCount > 0 ? spreadBudget / spreadCount : MIN_PX
        const clusterPx: number[] = clusters.map((_: Cluster, i: number) => {
          if (isFlat[i]) return FLATLINE_PX
          return Math.max(MIN_PX, equalPx)
        })

        // Normalize spread clusters so they exactly fill spreadBudget
        // (handles edge cases where MIN_PX floors push sum over budget).
        const spreadSum = clusterPx.reduce(
          (s: number, px: number, i: number) => s + (isFlat[i] ? 0 : px), 0
        )
        if (spreadSum > 0 && spreadCount > 0) {
          const scale = spreadBudget / spreadSum
          for (let i = 0; i < n; i++) {
            if (!isFlat[i]) clusterPx[i] = Math.max(MIN_PX, clusterPx[i] * scale)
          }
        }

        // Build segments bottom→top (EDGE_PAD breathing room at each edge)
        const segs: Seg[] = []
        let pCursor = this.bottom - EDGE_PAD
        for (let i = 0; i < n; i++) {
          const pBottom = pCursor
          const pTop    = pCursor - clusterPx[i]
          segs.push({ vMin: clusters[i].vMin, vMax: clusters[i].vMax, pTop, pBottom })
          pCursor = pTop

          if (i < n - 1) {
            segs.push({
              vMin:    clusters[i].vMax,
              vMax:    clusters[i + 1].vMin,
              pTop:    pCursor - GAP_PX,
              pBottom: pCursor,
            })
            pCursor -= GAP_PX
          }
        }
        return segs
      }

      getPixelForValue(this: any, value: number): number {
        const segs = this._getSegs()
        let px: number
        if (!segs.length) {
          px = LinearScale.prototype.getPixelForValue.call(this, value)
        } else {
          let found = false
          for (const seg of segs) {
            if (value >= seg.vMin && value <= seg.vMax) {
              const t = seg.vMax === seg.vMin
                ? 0
                : (value - seg.vMin) / (seg.vMax - seg.vMin)
              px = seg.pBottom - t * (seg.pBottom - seg.pTop)
              found = true
              break
            }
          }
          if (!found) {
            // outside all segments — clamp to scale boundary
            px = value < segs[0].vMin
              ? segs[0].pBottom
              : segs[segs.length - 1].pTop
          }
        }
        // Always clamp to this axis's own pixel range so out-of-range values
        // never bleed into an adjacent stacked axis's visual space.
        return Math.max(this.top, Math.min(this.bottom, px!))
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

        // Nice step ladder — smaller steps for tight clusters, larger for wide ones.
        // Step is chosen so ~TARGET ticks fit inside the cluster's value range.
        const STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500,
                       1000, 2000, 5000, 10000, 20000, 50000, 100000]
        const ticks: Array<{ value: number; major: boolean }> = []
        let minStep = Infinity

        // Get pixel layout — cluster i occupies segs[i*2] (odd indices = gap bands)
        const segs = this._getSegs()

        const distinct: number[] = this.options._pwDistinct ?? clusters.map(() => 5)

        for (let ci = 0; ci < clusters.length; ci++) {
          const c = clusters[ci]
          const range = c.vMax - c.vMin

          // Flatline: emit one tick at the actual data value (midpoint of padded bounds)
          if (distinct[ci] <= 1 || range < 0.001) {
            const realVal = Math.round(((c.vMin + c.vMax) / 2) * 1e6) / 1e6
            ticks.push({ value: realVal, major: false })
            continue
          }

          // Dynamic tick count: 1 tick per ~20px of this cluster's allocated pixel height
          const clusterSeg  = segs[ci * 2]
          const clusterPx   = clusterSeg ? (clusterSeg.pBottom - clusterSeg.pTop) : 80
          const targetTicks = Math.max(2, Math.floor(clusterPx / 20))
          const rough = range / targetTicks
          const step  = STEPS.find(s => s >= rough) ?? rough
          if (step < minStep) minStep = step

          // Emit ONLY clean multiples of `step` that fall inside the cluster.
          // This avoids raw boundary values like 38817 or 4918.
          // e.g. cluster 4611–4688, step=20 → ticks at 4620, 4640, 4660, 4680
          // e.g. cluster 38817–43920, step=1000 → ticks at 39000, 40000, 41000, 42000, 43000
          const first = Math.ceil(c.vMin / step) * step
          const last  = Math.floor(c.vMax / step) * step
          for (let v = first; v <= last + step * 0.001; v += step) {
            const rounded = Math.round(v / step) * step   // eliminate float drift
            if (rounded >= c.vMin - step * 0.01 && rounded <= c.vMax + step * 0.01) {
              ticks.push({ value: rounded, major: false })
            }
          }
        }

        // Smallest step drives decimal-precision in the tick callback
        if (isFinite(minStep) && this.options.ticks) {
          this.options.ticks.stepSize = minStep
        }

        // Deduplicate
        const seen = new Set<number>()
        this.ticks = ticks.filter(t => {
          const k = Math.round(t.value * 1e6)
          if (seen.has(k)) return false
          seen.add(k)
          return true
        })
        return this.ticks
      }

      /**
       * afterFit — drop ticks whose pixel positions are closer than MIN_PX apart.
       * By this point this.top/bottom are finalised so getPixelForValue() is accurate.
       * All ticks are equal-priority (clean step-multiples), so simply walk bottom→top
       * and keep whichever tick arrived first whenever two collide.
       */
      afterFit(this: any) {
        if (LinearScale.prototype.afterFit) {
          LinearScale.prototype.afterFit.call(this)
        }

        const clusters: Cluster[] = this.options._pwClusters
        if (!clusters || clusters.length <= 1 || !this.ticks?.length) return

        const MIN_PX = 14   // ~10px font + 4px padding

        // Cluster boundaries (vMin / vMax) must never be pruned — they correspond to
        // the actual data min/max dashes.  The gap between two adjacent bands can be
        // smaller than MIN_PX, which would otherwise drop the lower band's min tick.
        const boundaries = new Set<number>()
        clusters.forEach(c => {
          boundaries.add(Math.round(c.vMin * 1e6))
          boundaries.add(Math.round(c.vMax * 1e6))
        })
        const isBoundary = (v: number) => boundaries.has(Math.round(v * 1e6))

        const surviving: typeof this.ticks = []
        let lastPx = Infinity   // sentinel: start from "very bottom" of canvas

        for (const tick of this.ticks) {
          const px = this.getPixelForValue(tick.value)
          if (isBoundary(tick.value) || Math.abs(px - lastPx) >= MIN_PX) {
            surviving.push(tick)
            lastPx = px
          }
        }

        this.ticks = surviving
      }
    }

    ;(Chart as any).register(PiecewiseLinearScale)
  }
}
