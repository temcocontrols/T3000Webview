import Chart from 'chart.js/auto';

type Segment = { vMin: number; vMax: number; pTop: number; pBottom: number };
type Cluster = { vMin: number; vMax: number };

const SCALE_ID = 'piecewise';

if (!(Chart as any).registry?.scales?.get?.(SCALE_ID)) {
  const LinearScale = (Chart as any).registry?.scales?.get('linear');

  if (LinearScale) {
    class PiecewiseLinearScale extends LinearScale {
      static id = SCALE_ID;
      static defaults = {};

      _getSegs(): Segment[] {
        const clusters: Cluster[] = this.options._pwClusters;
        if (!clusters || clusters.length <= 1) return [];

        const height = this.bottom - this.top;
        const gapPx = Math.max(6, Math.min(18, Math.floor(height * 0.025)));
        const flatlinePx = Math.max(20, Math.min(40, Math.floor(height * 0.1)));
        const minPx = Math.max(30, Math.min(55, Math.floor(height * 0.15)));
        const edgePad = 4;

        const budget = height - 2 * edgePad - (clusters.length - 1) * gapPx;
        if (budget <= 0) return [];

        const distinct: number[] = this.options._pwDistinct ?? clusters.map(() => 5);
        const isFlat = distinct.map((count: number) => count <= 1);

        const flatCount = isFlat.filter(Boolean).length;
        const spreadCount = clusters.length - flatCount;
        const flatTotal = flatCount * flatlinePx;
        const spreadBudget = budget - flatTotal;

        const equalPx = spreadCount > 0 ? spreadBudget / spreadCount : minPx;
        const clusterPx = clusters.map((_: Cluster, index: number) => {
          if (isFlat[index]) return flatlinePx;
          return Math.max(minPx, equalPx);
        });

        const spreadSum = clusterPx.reduce((sum: number, px: number, index: number) => sum + (isFlat[index] ? 0 : px), 0);
        if (spreadSum > 0 && spreadCount > 0) {
          const scale = spreadBudget / spreadSum;
          for (let index = 0; index < clusterPx.length; index++) {
            if (!isFlat[index]) {
              clusterPx[index] = Math.max(minPx, clusterPx[index] * scale);
            }
          }
        }

        const segments: Segment[] = [];
        let cursor = this.bottom - edgePad;

        for (let index = 0; index < clusters.length; index++) {
          const bottom = cursor;
          const top = cursor - clusterPx[index];
          segments.push({ vMin: clusters[index].vMin, vMax: clusters[index].vMax, pTop: top, pBottom: bottom });
          cursor = top;

          if (index < clusters.length - 1) {
            segments.push({
              vMin: clusters[index].vMax,
              vMax: clusters[index + 1].vMin,
              pTop: cursor - gapPx,
              pBottom: cursor,
            });
            cursor -= gapPx;
          }
        }

        return segments;
      }

      getPixelForValue(value: number): number {
        const segments = this._getSegs();
        let pixel: number;

        if (!segments.length) {
          pixel = LinearScale.prototype.getPixelForValue.call(this, value);
        } else {
          let found = false;
          for (const segment of segments) {
            if (value >= segment.vMin && value <= segment.vMax) {
              const ratio = segment.vMax === segment.vMin ? 0 : (value - segment.vMin) / (segment.vMax - segment.vMin);
              pixel = segment.pBottom - ratio * (segment.pBottom - segment.pTop);
              found = true;
              break;
            }
          }

          if (!found) {
            pixel = value < segments[0].vMin ? segments[0].pBottom : segments[segments.length - 1].pTop;
          }
        }

        return Math.max(this.top, Math.min(this.bottom, pixel!));
      }

      getValueForPixel(pixel: number): number {
        const segments = this._getSegs();
        if (!segments.length) return LinearScale.prototype.getValueForPixel.call(this, pixel);

        for (const segment of segments) {
          if (pixel >= segment.pTop && pixel <= segment.pBottom) {
            const ratio = segment.pBottom === segment.pTop ? 0 : (segment.pBottom - pixel) / (segment.pBottom - segment.pTop);
            return segment.vMin + ratio * (segment.vMax - segment.vMin);
          }
        }

        return LinearScale.prototype.getValueForPixel.call(this, pixel);
      }

      buildTicks(): any[] {
        const clusters: Cluster[] = this.options._pwClusters;
        if (!clusters || clusters.length <= 1) return LinearScale.prototype.buildTicks.call(this);

        const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
        const ticks: Array<{ value: number; major: boolean }> = [];
        let minStep = Infinity;
        const segments = this._getSegs();
        const distinct: number[] = this.options._pwDistinct ?? clusters.map(() => 5);

        for (let index = 0; index < clusters.length; index++) {
          const cluster = clusters[index];
          const range = cluster.vMax - cluster.vMin;

          if (distinct[index] <= 1 || range < 0.001) {
            const realVal = Math.round(((cluster.vMin + cluster.vMax) / 2) * 1e6) / 1e6;
            ticks.push({ value: realVal, major: false });
            continue;
          }

          const clusterSeg = segments[index * 2];
          const clusterPx = clusterSeg ? (clusterSeg.pBottom - clusterSeg.pTop) : 80;
          const targetTicks = Math.max(2, Math.floor(clusterPx / 20));
          const rough = range / targetTicks;
          const step = steps.find((value) => value >= rough) ?? rough;
          if (step < minStep) minStep = step;

          const first = Math.ceil(cluster.vMin / step) * step;
          const last = Math.floor(cluster.vMax / step) * step;

          for (let value = first; value <= last + step * 0.001; value += step) {
            const rounded = Math.round(value / step) * step;
            if (rounded >= cluster.vMin - step * 0.01 && rounded <= cluster.vMax + step * 0.01) {
              ticks.push({ value: rounded, major: false });
            }
          }
        }

        if (isFinite(minStep) && this.options.ticks) {
          this.options.ticks.stepSize = minStep;
        }

        const seen = new Set<number>();
        this.ticks = ticks.filter((tick) => {
          const key = Math.round(tick.value * 1e6);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        return this.ticks;
      }

      afterFit() {
        if (LinearScale.prototype.afterFit) {
          LinearScale.prototype.afterFit.call(this);
        }

        const clusters: Cluster[] = this.options._pwClusters;
        if (!clusters || clusters.length <= 1 || !this.ticks?.length) return;

        const minPx = 14;
        const boundaries = new Set<number>();
        clusters.forEach((cluster) => {
          boundaries.add(Math.round(cluster.vMin * 1e6));
          boundaries.add(Math.round(cluster.vMax * 1e6));
        });
        const isBoundary = (value: number) => boundaries.has(Math.round(value * 1e6));

        const surviving: typeof this.ticks = [];
        let lastPx = Infinity;

        for (const tick of this.ticks) {
          const px = this.getPixelForValue(tick.value);
          if (isBoundary(tick.value) || Math.abs(px - lastPx) >= minPx) {
            surviving.push(tick);
            lastPx = px;
          }
        }

        this.ticks = surviving;
      }
    }

    Chart.register(PiecewiseLinearScale as any);
  }
}

export {};
