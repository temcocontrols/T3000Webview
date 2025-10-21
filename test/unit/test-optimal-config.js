// Test the optimal configurations implemented in TrendLogModal
const getTimeRangeMinutes = (range) => {
  const ranges = {
    '5m': 5, '15m': 15, '30m': 30, '1h': 60,
    '6h': 360, '12h': 720, '24h': 1440, '7d': 10080
  }
  return ranges[range] || 60
}

// Updated data point intervals (optimal)
const getDataPointInterval = (timeBase) => {
  const intervals = {
    '5m': 1,     // Every 1 minute
    '15m': 1,    // Every 1 minute
    '30m': 1,    // Every 1 minute
    '1h': 1,     // Every 1 minute
    '6h': 10,    // Every 10 minutes (optimal)
    '12h': 15,   // Every 15 minutes (optimal)
    '24h': 30,   // Every 30 minutes (optimal)
    '7d': 120    // Every 120 minutes (2 hours) (optimal)
  }
  return intervals[timeBase] || 1
}

// Updated axis settings (optimal)
const getTimeAxisUnit = (timeBase) => {
  switch (timeBase) {
    case '5m':
    case '15m':
    case '30m':
    case '1h':
    case '6h':  // Changed to minute for 30-minute intervals
      return 'minute'
    case '12h':
    case '24h':
      return 'hour'
    case '7d':
      return 'day'
    default:
      return 'hour'
  }
}

const getTimeAxisStepSize = (timeBase) => {
  switch (timeBase) {
    case '5m': return 1   // every 1 minute
    case '15m': return 3  // every 3 minutes
    case '30m': return 5  // every 5 minutes
    case '1h': return 10  // every 10 minutes
    case '6h': return 30  // every 30 minutes (optimal)
    case '12h': return 1  // every 1 hour (optimal)
    case '24h': return 2  // every 2 hours (optimal)
    case '7d': return 1   // every 1 day (optimal)
    default: return 1
  }
}

const getTimeAxisMaxTicks = (timeBase) => {
  switch (timeBase) {
    case '5m': return 6   // 6 ticks
    case '15m': return 6  // 6 ticks
    case '30m': return 7  // 7 ticks
    case '1h': return 6   // 6 ticks
    case '6h': return 13  // 13 ticks (optimal)
    case '12h': return 13 // 13 ticks (optimal)
    case '24h': return 13 // 13 ticks (optimal)
    case '7d': return 8   // 8 ticks (optimal)
    default: return 10
  }
}

// Test the optimal configurations
console.log('=== TESTING OPTIMAL CONFIGURATIONS ===')
const timebases = ['5m', '15m', '30m', '1h', '6h', '12h', '24h', '7d']

timebases.forEach(timebase => {
  const rangeMinutes = getTimeRangeMinutes(timebase)
  const dataInterval = getDataPointInterval(timebase)
  const dataPoints = Math.floor(rangeMinutes / dataInterval) + 1
  const axisUnit = getTimeAxisUnit(timebase)
  const stepSize = getTimeAxisStepSize(timebase)
  const maxTicks = getTimeAxisMaxTicks(timebase)

  console.log(`${timebase}: ${rangeMinutes}min range`)
  console.log(`  Data: every ${dataInterval}min �?${dataPoints} points`)
  console.log(`  Axis: ${axisUnit} unit, step ${stepSize}, max ${maxTicks} ticks`)
  console.log(`  Points per tick: ${(dataPoints / maxTicks).toFixed(1)}`)
  console.log('')
})

console.log('=== VERIFICATION: LONGER TIMEBASES ===')
const longTimebases = ['6h', '12h', '24h', '7d']

longTimebases.forEach(timebase => {
  const rangeMinutes = getTimeRangeMinutes(timebase)
  const dataInterval = getDataPointInterval(timebase)
  const dataPoints = Math.floor(rangeMinutes / dataInterval) + 1
  const maxTicks = getTimeAxisMaxTicks(timebase)

  console.log(`${timebase}: ${dataPoints} data points, ${maxTicks} ticks = ${(dataPoints / maxTicks).toFixed(1)} points/tick`)

  // Verify data points are reasonable (not too dense or sparse)
  if (dataPoints < 20) {
    console.log('  ⚠️  Warning: Very few data points - might look sparse')
  } else if (dataPoints > 100) {
    console.log('  ⚠️  Warning: Many data points - might impact performance')
  } else {
    console.log('  �?Good data point count')
  }

  // Verify points per tick is reasonable
  const pointsPerTick = dataPoints / maxTicks
  if (pointsPerTick < 2) {
    console.log('  ⚠️  Warning: Very few points per tick - might look disconnected')
  } else if (pointsPerTick > 10) {
    console.log('  ⚠️  Warning: Many points per tick - might be too dense')
  } else {
    console.log('  �?Good points per tick ratio')
  }
  console.log('')
})
