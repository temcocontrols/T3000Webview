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

        const n        = clusters.length
        const GAP_PX   = 18    // fixed pixel gap drawn between each pair of clusters
        const FLAT_PX  = 40    // fixed height for flatline (1 unique value) clusters
        const MIN_SPREAD_PX = 40  // minimum height for any non-flatline cluster
        const EDGE_PAD_PX = 4   // reserved pixels at top & bottom so line strokes aren't clipped

        const totalPx = this.bottom - this.top - 2 * EDGE_PAD_PX
        if (totalPx <= 0) return []

        const distinct: number[] = this.options._pwDistinct ?? clusters.map(() => 5)
        const isFlat = distinct.map(d => d <= 1)

        // Pixel allocation:
        //   • Flatline clusters → FLAT_PX (fixed, compact).
        //   • Spread clusters   → equal share of all remaining pixels.
        //     Equal share means every band of data gets the same screen real-estate
        //     regardless of whether its value range is 73 units or 1700 units.
        //     This maximises px/unit for the tightest cluster (most important for
        //     seeing closely-spaced lines).
        const gapCount    = n - 1
        const totalGapPx  = gapCount * GAP_PX
        const numFlat     = isFlat.filter(Boolean).length
        const numSpread   = n - numFlat
        const afterGapsAndFlats = totalPx - totalGapPx - numFlat * FLAT_PX
        const spreadPx    = numSpread > 0
          ? Math.max(afterGapsAndFlats / numSpread, MIN_SPREAD_PX)
          : MIN_SPREAD_PX

        const clusterPx = isFlat.map(flat => flat ? FLAT_PX : spreadPx)

        // --- build segments bottom→top (leave EDGE_PAD_PX breathing room at each edge) ---
        const segs: Seg[] = []
        let pCursor = this.bottom - EDGE_PAD_PX

        for (let i = 0; i < n; i++) {
          const c       = clusters[i]
          const segPx   = clusterPx[i]
          const pBottom = pCursor
          const pTop    = pCursor - segPx
          segs.push({ vMin: c.vMin, vMax: c.vMax, pTop, pBottom })
          pCursor = pTop

          if (i < n - 1) {
            segs.push({
              vMin:    c.vMax,
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
        const TARGET = 5
        const ticks: Array<{ value: number; major: boolean }> = []
        let minStep = Infinity

        const distinct: number[] = this.options._pwDistinct ?? clusters.map(() => TARGET)

        for (let ci = 0; ci < clusters.length; ci++) {
          const c = clusters[ci]
          const range = c.vMax - c.vMin

          // Flatline: emit one tick at the actual data value (midpoint of padded bounds)
          if (distinct[ci] <= 1 || range < 0.001) {
            const realVal = Math.round(((c.vMin + c.vMax) / 2) * 1e6) / 1e6
            ticks.push({ value: realVal, major: false })
            continue
          }

          // Pick step size proportional to range — large range → large step → readable gaps
          const rough = range / TARGET
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

        const surviving: typeof this.ticks = []
        let lastPx = Infinity   // sentinel: start from "very bottom" of canvas

        for (const tick of this.ticks) {
          const px = this.getPixelForValue(tick.value)
          if (Math.abs(px - lastPx) >= MIN_PX) {
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
