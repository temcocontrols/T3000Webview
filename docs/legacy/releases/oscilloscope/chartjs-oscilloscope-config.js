const config = {
  type: 'line',
  data: {
    labels: [], // Will be populated with time values
    datasets: [
      {
        label: 'Analog Signal (Blue)',
        data: [],
        borderColor: '#0066CC',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0, // Sharp corners for digital-like signals
        yAxisID: 'analog'
      },
      {
        label: 'Digital Signal 1 (Red)',
        data: [],
        borderColor: '#FF3366',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0,
        stepped: true, // Creates square wave appearance
        yAxisID: 'digital1'
      },
      {
        label: 'Digital Signal 2 (Green)',
        data: [],
        borderColor: '#00CC66',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0,
        stepped: true,
        yAxisID: 'digital2'
      },
      {
        label: 'Digital Signal 3 (Purple)',
        data: [],
        borderColor: '#9966CC',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0,
        stepped: true,
        yAxisID: 'digital3'
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // Disable animation for real-time performance
    plugins: {
      legend: {
        display: true,
        position: 'left',
        labels: {
          usePointStyle: true,
          boxWidth: 10
        }
      },
      zoom: {
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
        },
        pan: {
          enabled: true,
          mode: 'x',
        }
      }
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: 'Time (μs)'
        },
        grid: {
          display: true,
          color: '#E0E0E0',
          lineWidth: 0.5
        },
        ticks: {
          maxTicksLimit: 10,
          callback: function(value) {
            return value.toFixed(1);
          }
        }
      },
      analog: {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: 'Voltage (V)'
        },
        min: -1.0,
        max: 1.0,
        grid: {
          display: true,
          color: '#E0E0E0',
          lineWidth: 0.5
        },
        ticks: {
          stepSize: 0.2
        }
      },
      digital1: {
        type: 'linear',
        position: 'left',
        display: false,
        min: 2,
        max: 4
      },
      digital2: {
        type: 'linear',
        position: 'left',
        display: false,
        min: 5,
        max: 7
      },
      digital3: {
        type: 'linear',
        position: 'left',
        display: false,
        min: 8,
        max: 10
      }
    },
    elements: {
      point: {
        radius: 0 // No points on lines
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  }
};

// Sample data generation function
function generateSampleData() {
  const timePoints = [];
  const analogData = [];
  const digital1Data = [];
  const digital2Data = [];
  const digital3Data = [];
  
  for (let i = 0; i <= 500; i++) {
    const time = i * 0.9; // 0.9μs intervals
    timePoints.push(time);
    
    // Analog sine wave with some noise
    analogData.push({
      x: time,
      y: 0.8 * Math.sin(time * 0.05) + 0.1 * Math.random()
    });
    
    // Digital square wave patterns
    digital1Data.push({
      x: time,
      y: (Math.floor(time / 20) % 2) ? 3.8 : 2.2
    });
    
    digital2Data.push({
      x: time,
      y: (Math.floor(time / 10) % 2) ? 6.8 : 5.2
    });
    
    digital3Data.push({
      x: time,
      y: (Math.floor(time / 15) % 2) ? 9.8 : 8.2
    });
  }
  
  return {
    labels: timePoints,
    analog: analogData,
    digital1: digital1Data,
    digital2: digital2Data,
    digital3: digital3Data
  };
}

// Initialize chart
const ctx = document.getElementById('oscilloscope-chart').getContext('2d');
const sampleData = generateSampleData();

config.data.labels = sampleData.labels;
config.data.datasets[0].data = sampleData.analog;
config.data.datasets[1].data = sampleData.digital1;
config.data.datasets[2].data = sampleData.digital2;
config.data.datasets[3].data = sampleData.digital3;

const chart = new Chart(ctx, config);