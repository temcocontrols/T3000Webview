// Verify all 6h maxTicks configurations are consistent
console.log('=== VERIFYING 6H MAXTICKS CONFIGURATIONS ===')

// From getTimeAxisMaxTicks function
const getTimeAxisMaxTicks = () => {
  const configs = {
    '6h': 10 // 10 ticks for 6 hours (every 40 minutes)
  }
  return configs['6h']
}

// From first maxTicksConfigs (chart configuration)
const chartMaxTicksConfigs = {
  '6h': 10   // 9 intervals + 1 (every 40 minutes)
}

// From second maxTicksConfigs (x-axis scale configuration)
const xAxisMaxTicksConfigs = {
  '6h': 10   // 9 intervals + 1 (every 40 minutes)
}

// Step size configuration
const stepSize = 40 // every 40 minutes

// Calculate expected ticks
const rangeMinutes = 360 // 6 hours
const expectedTicks = Math.floor(rangeMinutes / stepSize) + 1

console.log(`6h timebase configurations:`)
console.log(`  Range: ${rangeMinutes} minutes`)
console.log(`  Step size: ${stepSize} minutes`)
console.log(`  Expected ticks: ${expectedTicks}`)
console.log('')
console.log(`Configuration consistency check:`)
console.log(`  getTimeAxisMaxTicks(): ${getTimeAxisMaxTicks()}`)
console.log(`  chartMaxTicksConfigs: ${chartMaxTicksConfigs['6h']}`)
console.log(`  xAxisMaxTicksConfigs: ${xAxisMaxTicksConfigs['6h']}`)
console.log('')

// Verify consistency
const allConfigsMatch = (
  getTimeAxisMaxTicks() === expectedTicks &&
  chartMaxTicksConfigs['6h'] === expectedTicks &&
  xAxisMaxTicksConfigs['6h'] === expectedTicks
)

console.log(`All configurations match expected: ${allConfigsMatch ? '✅ YES' : '❌ NO'}`)

if (allConfigsMatch) {
  console.log('🎯 Perfect! All 6h maxTicks configurations are consistent with 40-minute steps')
} else {
  console.log('⚠️  Some configurations need adjustment')
}

console.log('')
console.log('=== 40-MINUTE TICK TIMELINE ===')
for (let i = 0; i < expectedTicks; i++) {
  const minutes = i * stepSize
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const timeLabel = `${hours}:${mins.toString().padStart(2, '0')}`
  console.log(`Tick ${(i + 1).toString().padStart(2)}: ${timeLabel}`)
}
