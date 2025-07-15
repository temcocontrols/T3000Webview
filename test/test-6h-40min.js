// Test the updated 6h configuration with 40-minute steps
const getTimeRangeMinutes = (range) => {
  const ranges = {
    '6h': 360
  }
  return ranges[range] || 60
}

const getDataPointInterval = (timeBase) => {
  const intervals = {
    '6h': 10    // Every 10 minutes (data)
  }
  return intervals[timeBase] || 1
}

const getTimeAxisStepSize = (timeBase) => {
  const stepSizes = {
    '6h': 40  // Every 40 minutes (grid) - NEW
  }
  return stepSizes[timeBase] || 1
}

const getTimeAxisMaxTicks = (timeBase) => {
  const maxTicks = {
    '6h': 10  // 10 ticks for 6 hours (every 40 minutes) - NEW
  }
  return maxTicks[timeBase] || 10
}

console.log('=== UPDATED 6H CONFIGURATION TEST (40min steps) ===')

const timebase = '6h'
const rangeMinutes = getTimeRangeMinutes(timebase)
const dataInterval = getDataPointInterval(timebase)
const stepSize = getTimeAxisStepSize(timebase)
const maxTicks = getTimeAxisMaxTicks(timebase)

const dataPoints = Math.floor(rangeMinutes / dataInterval) + 1
const actualTicks = Math.floor(rangeMinutes / stepSize) + 1
const pointsPerTick = dataPoints / actualTicks

console.log(`6h timebase (${rangeMinutes} minutes):`)
console.log(`  Data: every ${dataInterval}min → ${dataPoints} points`)
console.log(`  Grid: every ${stepSize}min → ${actualTicks} actual ticks (max: ${maxTicks})`)
console.log(`  Points per tick: ${pointsPerTick.toFixed(1)}`)
console.log('')

// Compare with previous configurations
console.log('=== COMPARISON ===')
console.log('ORIGINAL (30min steps): 13 ticks, 2.8 points/tick')
console.log('PREVIOUS (20min steps): 19 ticks, 1.9 points/tick')
console.log(`NEW (40min steps): ${actualTicks} ticks, ${pointsPerTick.toFixed(1)} points/tick`)
console.log('')

// Verify tick spacing
console.log('=== TICK TIMELINE (40min intervals) ===')
for (let i = 0; i <= actualTicks - 1; i++) {
  const minutes = i * stepSize
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const timeLabel = `${hours}:${mins.toString().padStart(2, '0')}`
  console.log(`Tick ${(i + 1).toString().padStart(2)}: ${timeLabel} (${minutes}min)`)
}
console.log('')

// Quality assessment
let quality = '✅ GOOD'
if (actualTicks < 8) quality = '⚠️  Few ticks (might be sparse)'
if (actualTicks > 15) quality = '⚠️  Many ticks (might be crowded)'
if (pointsPerTick < 2) quality = '⚠️  Sparse data'
if (pointsPerTick > 6) quality = '⚠️  Dense data'

console.log(`Quality: ${quality}`)
console.log('Result: Clean 40-minute grid divisions for 6-hour view')
console.log('Benefits: Fewer ticks, cleaner appearance, good spacing')
