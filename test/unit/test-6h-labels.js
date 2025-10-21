// Test 6h x-axis label visibility with updated configuration
console.log('=== TESTING 6H X-AXIS LABEL VISIBILITY ===')

const timebase = '6h'
const rangeMinutes = 360  // 6 hours
const stepSize = 40       // Every 40 minutes
const maxTicks = 13       // Maximum allowed ticks

// Calculate expected ticks
const calculatedTicks = Math.floor(rangeMinutes / stepSize) + 1
const actualTicks = Math.min(calculatedTicks, maxTicks)

console.log(`6h timebase analysis:`)
console.log(`  Range: ${rangeMinutes} minutes`)
console.log(`  Step size: ${stepSize} minutes`)
console.log(`  Calculated ticks: ${calculatedTicks}`)
console.log(`  MaxTicks limit: ${maxTicks}`)
console.log(`  Actual ticks shown: ${actualTicks}`)
console.log('')

// Generate tick timeline
console.log('=== EXPECTED X-AXIS LABELS (40min intervals) ===')
for (let i = 0; i < actualTicks; i++) {
  const minutes = i * stepSize
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const timeLabel = `${hours}:${mins.toString().padStart(2, '0')}`
  const isLastLabel = (i === actualTicks - 1)
  console.log(`Tick ${(i + 1).toString().padStart(2)}: ${timeLabel} ${isLastLabel ? 'â†?LAST LABEL' : ''}`)
}
console.log('')

// Compare with working 1h pattern
console.log('=== COMPARISON WITH WORKING 1H PATTERN ===')
const h1StepSize = 5
const h1Range = 60
const h1MaxTicks = 13
const h1Calculated = Math.floor(h1Range / h1StepSize) + 1
const h1Actual = Math.min(h1Calculated, h1MaxTicks)

console.log(`1h: ${h1Range}min, ${h1StepSize}min steps â†?${h1Calculated} calc, ${h1MaxTicks} max â†?${h1Actual} shown`)
console.log(`6h: ${rangeMinutes}min, ${stepSize}min steps â†?${calculatedTicks} calc, ${maxTicks} max â†?${actualTicks} shown`)
console.log('')

// Analysis
if (calculatedTicks <= maxTicks) {
  console.log('âœ?SHOULD WORK: Calculated ticks fit within maxTicks limit')
  console.log('âœ?All labels including last should be visible')
} else {
  console.log('âš ï¸  POTENTIAL ISSUE: Calculated ticks exceed maxTicks')
  console.log('âš ï¸  Some labels might be clipped or hidden')
}

console.log('')
console.log('=== KEY DIFFERENCE FROM PREVIOUS CONFIG ===')
console.log('BEFORE: stepSize=20min â†?18 calculated ticks > 13 maxTicks â†?clipping!')
console.log('AFTER:  stepSize=40min â†?10 calculated ticks < 13 maxTicks â†?fits!')
console.log('')
console.log('Result: Last x-axis label should now be visible at 6:00')
