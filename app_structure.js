/**
 * Smart Agriculture Monitoring System
 * External JavaScript file for the ESP8266-based monitoring system
 * 
 * This file should be hosted on a CDN, GitHub Pages, or another web server
 * and linked from the ESP8266 HTML output.
 */

// Application Configuration
const CONFIG = {
  apiEndpoints: {
    data: '/data',
    soilType: '/soilType',
    location: '/location'
  },
  refreshInterval: 1000, // milliseconds
  maxDataPoints: 30,
  chartColors: {
    temperature: '#ff4444',
    pressure: '#2196f3',
    moisture: '#9c27b0',
    altitude: '#4caf50'
  }
};

// Theme Management
let darkMode = localStorage.getItem("darkMode") === "true";

// Main application setup
document.addEventListener('DOMContentLoaded', function() {
  console.log('Agriculture Monitoring System initializing...');
  
  // Initialize global state
  window.state = {
    charts: {},
    chartData: {
      temp: { times: [], values: [] },
      pressure: { times: [], values: [] },
      altitude: { times: [], values: [] },
      moisture: { times: [], values: [] }
    },
    systemStatus: {
      online: true,
      lastApiSuccess: true,
      lastDataUpdate: Date.now(),
      errors: [],
      warnings: [],
      dataSamples: 0,
      networkLatency: 0,
      espStatus: 'online',
      sensorStatus: 'active',
      apiStatus: 'connected'
    },
    pageLoadTime: Date.now()
  };
  
  // Initialize application components
  initializeUI();
  setupEventListeners();
  startDataPolling();
  
  // Load initial theme
  applyTheme();
  
  // Start data refresh
  startDataRefresh();
  
  // Update time
  updateCurrentTime();
  setInterval(updateCurrentTime, 1000);
  
  // Show welcome toast
  showToast("System initialized", "success");
});

// Initialize UI components
function initializeUI() {
  initializeToastSystem();
  initializeThemeManager();
  createDashboard();
}

// Create the main dashboard UI
function createDashboard() {
  const appContainer = document.getElementById('app-container');
  
  // Clear loading message
  appContainer.innerHTML = '';
  
  // Create dashboard grid
  const dashboardHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Dashboard Overview Card -->
      <div class="card bg-white rounded-xl shadow-lg hover:shadow-xl transition-all lg:col-span-3">
        <div class="card-body p-6">
          <h2 class="text-xl font-semibold mb-4 text-gray-800">Smart Agriculture Dashboard</h2>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-blue-50 rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <div class="text-blue-500 mb-2">
                <i class="fas fa-thermometer-half text-3xl"></i>
              </div>
              <h3 class="text-sm font-semibold text-gray-600">Temperature</h3>
              <p id="dash-temp" class="text-2xl font-bold text-blue-600">--°C</p>
            </div>
            <div class="bg-green-50 rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <div class="text-green-500 mb-2">
                <i class="fas fa-tint text-3xl"></i>
              </div>
              <h3 class="text-sm font-semibold text-gray-600">Soil Moisture</h3>
              <p id="dash-moisture" class="text-2xl font-bold text-green-600">--%</p>
            </div>
            <div class="bg-purple-50 rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <div class="text-purple-500 mb-2">
                <i class="fas fa-seedling text-3xl"></i>
              </div>
              <h3 class="text-sm font-semibold text-gray-600">Recommended Crop</h3>
              <p id="dash-crop" class="text-xl font-bold text-purple-600">--</p>
            </div>
            <div class="bg-amber-50 rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <div class="text-amber-500 mb-2">
                <i class="fas fa-cloud-sun text-3xl"></i>
              </div>
              <h3 class="text-sm font-semibold text-gray-600">Forecast</h3>
              <p id="dash-forecast" class="text-xl font-bold text-amber-600">--</p>
            </div>
          </div>
          <div class="mt-4 flex justify-between">
            <div class="flex items-center">
              <span id="system-uptime" class="text-sm text-gray-500">Uptime: Calculating...</span>
            </div>
            <div class="flex gap-2">
              <button id="refresh-data" class="btn btn-sm btn-outline-primary btn-icon">
                <i class="fas fa-sync-alt"></i> Refresh
              </button>
              <button id="toggle-theme" class="btn btn-sm btn-outline-secondary btn-icon">
                <i class="fas fa-moon"></i> Theme
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Temperature Card -->
      <div class="card bg-white rounded-xl shadow-lg hover:shadow-xl transition-all" id="temperature-card">
        <div class="card-body p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-gray-800">Temperature</h2>
            <span class="text-sm text-gray-500" id="temp-last-updated">Last update: just now</span>
          </div>
          <div class="relative">
            <div class="flex items-center space-x-2 mb-4">
              <span id="tempValue" class="text-4xl font-bold text-blue-600">--</span>
              <span class="text-2xl text-gray-600">°C</span>
            </div>
            <div class="chart-container">
              <canvas id="tempChart"></canvas>
            </div>
            <div id="temp-loading" class="loading-overlay" style="display:none;">
              <div class="spinner"></div>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 mt-4">
            <button class="btn btn-sm btn-outline-primary" onclick="setTimeframe(30)">30s</button>
            <button class="btn btn-sm btn-outline-primary" onclick="setTimeframe(60)">1m</button>
            <button class="btn btn-sm btn-outline-primary" onclick="setTimeframe(300)">5m</button>
            <div class="flex items-center gap-2">
              <input type="number" id="customTime" class="form-control form-control-sm w-20" placeholder="Sec">
              <button class="btn btn-sm btn-primary" onclick="setCustomTimeframe()">Set</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Add more cards for other data types - these will be created dynamically -->
    </div>
  `;
  
  appContainer.innerHTML = dashboardHTML;
  
  // Initialize charts
  initCharts();
  initializeEmptyData();
}

// Set up main event listeners
function setupEventListeners() {
  // Refresh button handler
  document.getElementById('refresh-data').addEventListener('click', function() {
    updateCharts();
    toastSystem.info('Refreshing data...');
  });
  
  // Network status detection
  window.addEventListener('online', () => {
    window.state.systemStatus.online = true;
    updateSystemStatus();
    toastSystem.success('Network connection restored');
    updateCharts();
  });
  
  window.addEventListener('offline', () => {
    window.state.systemStatus.online = false;
    updateSystemStatus();
    toastSystem.error('Network connection lost');
  });
  
  // Error handling
  window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
    window.state.systemStatus.errors.push('JavaScript error: ' + event.message);
    updateSystemStatus();
    
    const errorKey = event.filename + ':' + event.lineno;
    if (!window.reportedErrors) window.reportedErrors = {};
    
    if (!window.reportedErrors[errorKey]) {
      toastSystem.error('An error occurred in the application. Some features may be limited.');
      window.reportedErrors[errorKey] = true;
    }
    
    event.preventDefault();
  });
  
  // Theme toggle
  document.getElementById("toggle-theme").addEventListener("click", toggleTheme);
  
  // Settings change
  document.getElementById("refreshInterval").addEventListener("change", saveSettings);
  document.getElementById("soilType").addEventListener("change", saveSettings);
}

// Start the data polling cycle
function startDataPolling() {
  function poll() {
    try {
      updateCharts();
    } catch (error) {
      console.error('Error in update cycle:', error);
      window.state.systemStatus.errors.push('Update cycle error: ' + error.message);
      updateSystemStatus();
    }
    
    setTimeout(poll, CONFIG.refreshInterval);
  }
  
  poll();
}

// Toggle between light and dark theme
function toggleTheme() {
  darkMode = !darkMode;
  localStorage.setItem("darkMode", darkMode);
  applyTheme();
}

// Apply the current theme
function applyTheme() {
  if (darkMode) {
    document.body.classList.add("dark-theme");
    document.getElementById("themeIcon").innerText = "light_mode";
    document.getElementById("themeText").innerText = "Light Mode";
  } else {
    document.body.classList.remove("dark-theme");
    document.getElementById("themeIcon").innerText = "dark_mode";
    document.getElementById("themeText").innerText = "Dark Mode";
  }
}

// Load user settings
function loadSettings() {
  // Load refresh interval
  const refreshInterval = localStorage.getItem("refreshInterval");
  if (refreshInterval) {
    document.getElementById("refreshInterval").value = refreshInterval;
  }
  
  // Load soil type
  const soilType = localStorage.getItem("soilType");
  if (soilType) {
    document.getElementById("soilType").value = soilType;
  }
}

// Save user settings
function saveSettings() {
  const refreshInterval = document.getElementById("refreshInterval").value;
  const soilType = document.getElementById("soilType").value;
  
  localStorage.setItem("refreshInterval", refreshInterval);
  localStorage.setItem("soilType", soilType);
  
  // Restart data refresh with new interval
  startDataRefresh();
  
  showToast("Settings saved", "success");
}

// Update network connection status
function updateNetworkStatus(isOnline = navigator.onLine) {
  const statusDot = document.getElementById("networkStatus");
  const statusText = document.getElementById("networkStatusText");
  
  if (isOnline) {
    statusDot.className = "status-dot online";
    statusText.innerText = "Connected";
  } else {
    statusDot.className = "status-dot offline";
    statusText.innerText = "Offline";
    showToast("Network connection lost", "error");
  }
}

// Update current time display
function updateCurrentTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString();
  document.getElementById("currentTime").innerText = timeString;
}

// Data refresh variables
let dataRefreshInterval;

// Start periodic data refresh
function startDataRefresh() {
  // Clear existing interval if any
  if (dataRefreshInterval) {
    clearInterval(dataRefreshInterval);
  }
  
  // Get refresh interval from settings (default 30s)
  const refreshInterval = parseInt(document.getElementById("refreshInterval").value) || 30;
  
  // Perform immediate refresh
  refreshData();
  
  // Set up interval for future refreshes
  dataRefreshInterval = setInterval(refreshData, refreshInterval * 1000);
}

// Refresh all sensor data
function refreshData() {
  // Fetch data from ESP8266 API endpoint
  fetch("/api/sensor-data")
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to fetch sensor data");
      }
      return response.json();
    })
    .then(data => {
      // Update UI with new data
      updateSensorDisplays(data);
      
      // Update charts
      updateCharts(data);
      
      // Generate crop recommendations
      generateCropRecommendations(data);
      
      // Update timestamps
      const now = new Date().toLocaleTimeString();
      document.getElementById("tempLastUpdated").innerText = now;
      document.getElementById("moistureLastUpdated").innerText = now;
    })
    .catch(error => {
      console.error("Error fetching sensor data:", error);
      showToast("Failed to update sensor data", "error");
    });
}

// Update sensor displays with latest data
function updateSensorDisplays(data) {
  // Update temperature
  if (data.temperature !== undefined) {
    document.getElementById("temperature").innerText = `${data.temperature.toFixed(1)}°C`;
  }
  
  // Update soil moisture
  if (data.moisture !== undefined) {
    document.getElementById("soilMoisture").innerText = `${data.moisture.toFixed(1)}%`;
  }
}

// Initialize charts
function initCharts() {
  const tempCtx = document.getElementById('tempChart').getContext('2d');
  
  // Initialize temperature chart
  window.state.charts.temp = new Chart(tempCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Temperature (°C)',
        data: [],
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: CONFIG.chartColors.temperature,
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: false,
          grid: {
            color: 'rgba(200, 200, 200, 0.2)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
  
  // Initialize empty data
  initializeEmptyData();
}

// Initialize chart with empty data
function initializeEmptyData() {
  const timeLabels = [];
  const now = new Date();
  
  for (let i = 0; i < CONFIG.maxDataPoints; i++) {
    const time = new Date(now.getTime() - (CONFIG.maxDataPoints - i) * 1000);
    timeLabels.push(time.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }));
    
    window.state.chartData.temp.times.push(time);
    window.state.chartData.temp.values.push(null);
  }
  
  // Update chart with empty data
  window.state.charts.temp.data.labels = timeLabels;
  window.state.charts.temp.data.datasets[0].data = window.state.chartData.temp.values;
  window.state.charts.temp.update();
}

// Update charts with new data
function updateCharts(data = null) {
  const now = new Date();
  const timeLabel = now.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
  
  // Add new time point
  window.state.chartData.temp.times.push(now);
  
  // Remove old data points if we exceed max
  if (window.state.chartData.temp.times.length > CONFIG.maxDataPoints) {
    window.state.chartData.temp.times.shift();
    window.state.chartData.temp.values.shift();
  }
  
  // Add new data point
  if (data && data.temperature !== undefined) {
    window.state.chartData.temp.values.push(data.temperature);
    document.getElementById('tempValue').textContent = data.temperature.toFixed(1);
  } else {
    // If no data, add null point
    window.state.chartData.temp.values.push(null);
  }
  
  // Update the chart
  const times = window.state.chartData.temp.times.map(time => 
    time.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })
  );
  
  window.state.charts.temp.data.labels = times;
  window.state.charts.temp.data.datasets[0].data = window.state.chartData.temp.values;
  window.state.charts.temp.update();
  
  // Update last updated time
  document.getElementById('temp-last-updated').textContent = 'Last update: ' + timeLabel;
}

// Generate crop recommendations based on sensor data
function generateCropRecommendations(data) {
  const container = document.getElementById("cropRecommendations");
  const soilType = document.getElementById("soilType").value;
  
  // Clear previous recommendations
  if (!container) return;
  container.innerHTML = "";
  
  if (!data.temperature || !data.moisture) {
    container.innerHTML = "<p>Insufficient data for recommendations</p>";
    return;
  }
  
  // Simple recommendation logic based on temperature and moisture
  const recommendations = [];
  
  // Temperature-based recommendations
  if (data.temperature < 15) {
    recommendations.push("Cold-weather crops: Spinach, Kale, Cabbage");
  } else if (data.temperature >= 15 && data.temperature < 25) {
    recommendations.push("Moderate-temperature crops: Lettuce, Carrots, Potatoes");
  } else {
    recommendations.push("Warm-weather crops: Tomatoes, Peppers, Cucumbers");
  }
  
  // Moisture-based recommendations
  if (data.moisture < 30) {
    recommendations.push("Drought-resistant crops: Succulents, Cacti, Drought-resistant herbs");
  } else if (data.moisture >= 30 && data.moisture < 60) {
    recommendations.push("Moderate-water crops: Beans, Corn, Sunflowers");
  } else {
    recommendations.push("Water-loving crops: Rice, Watercress, Mint");
  }
  
  // Soil type considerations
  if (soilType === "sandy") {
    recommendations.push("Sandy soil crops: Carrots, Radishes, Potatoes");
  } else if (soilType === "clay") {
    recommendations.push("Clay soil crops: Beans, Broccoli, Cabbage");
  } else if (soilType === "loamy") {
    recommendations.push("Loamy soil crops: Most vegetables thrive");
  } else if (soilType === "silty") {
    recommendations.push("Silty soil crops: Most vegetables, especially leafy greens");
  }
  
  // Display recommendations
  recommendations.forEach(rec => {
    const p = document.createElement("p");
    p.className = "mb-2";
    p.innerText = rec;
    container.appendChild(p);
  });
  
  // Update dashboard recommendation
  const dashCrop = document.getElementById('dash-crop');
  if (dashCrop && recommendations.length > 0) {
    // Extract the first crop from the first recommendation
    const firstRec = recommendations[0];
    const cropMatch = firstRec.match(/: (.*?)(?:,|$)/);
    if (cropMatch && cropMatch[1]) {
      dashCrop.textContent = cropMatch[1];
    } else {
      dashCrop.textContent = "See recommendations";
    }
  }
}

// Initialize toast notification system
function initializeToastSystem() {
  const toastContainer = document.createElement('div');
  toastContainer.id = 'toastContainer';
  toastContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col-reverse items-end space-y-reverse space-y-2';
  document.body.appendChild(toastContainer);
  
  // Create global toast system
  window.toastSystem = {
    success: (message) => showToast(message, 'success'),
    error: (message) => showToast(message, 'error'),
    warning: (message) => showToast(message, 'warning'),
    info: (message) => showToast(message, 'info')
  };
}

// Show toast notification
function showToast(message, type = "info") {
  const toastContainer = document.getElementById('toastContainer');
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} opacity-0 transform translate-x-full transition-all duration-300 max-w-xs`;
  
  // Set icon based on type
  let icon = 'info';
  if (type === 'success') icon = 'check_circle';
  if (type === 'error') icon = 'error';
  if (type === 'warning') icon = 'warning';
  
  toast.innerHTML = `
    <div class="flex items-center p-4 rounded-lg shadow-lg bg-white dark:bg-gray-800 border-l-4 ${getBorderColorClass(type)}">
      <div class="flex-shrink-0 mr-3">
        <i class="material-icons ${getTextColorClass(type)}">${icon}</i>
      </div>
      <div class="flex-1 ${getTextColorClass(type)}">
        ${message}
      </div>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  
  // Animate entrance
  setTimeout(() => {
    toast.classList.remove('opacity-0', 'translate-x-full');
  }, 10);
  
  // Auto-remove
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-full');
    setTimeout(() => {
      if (toast.parentNode === toastContainer) {
        toastContainer.removeChild(toast);
      }
    }, 300);
  }, 5000);
  
  // Helper functions for toast styling
  function getBorderColorClass(type) {
    switch(type) {
      case 'success': return 'border-green-500';
      case 'error': return 'border-red-500';
      case 'warning': return 'border-yellow-500';
      default: return 'border-blue-500';
    }
  }
  
  function getTextColorClass(type) {
    switch(type) {
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  }
}

// Update system status display
function updateSystemStatus() {
  const status = window.state.systemStatus;
  
  // Calculate uptime
  const uptimeSeconds = Math.floor((Date.now() - window.state.pageLoadTime) / 1000);
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;
  
  const uptimeText = `Uptime: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  document.getElementById('system-uptime').textContent = uptimeText;
  
  // Update network status indicators (if they exist)
  const networkStatus = document.getElementById('networkStatus');
  if (networkStatus) {
    networkStatus.className = `status-dot ${status.online ? 'online' : 'offline'}`;
  }
  
  const networkStatusText = document.getElementById('networkStatusText');
  if (networkStatusText) {
    networkStatusText.innerText = status.online ? 'Connected' : 'Offline';
  }
}

// Set timeframe for charts
function setTimeframe(seconds) {
  CONFIG.maxDataPoints = seconds;
  toastSystem.info(`Chart timeframe set to ${seconds} seconds`);
  initializeEmptyData();
}

// Set custom timeframe from input
function setCustomTimeframe() {
  const input = document.getElementById('customTime');
  const value = parseInt(input.value);
  
  if (isNaN(value) || value < 5 || value > 3600) {
    toastSystem.error('Please enter a valid time between 5 and 3600 seconds');
    return;
  }
  
  setTimeframe(value);
}

// Mock data for testing when not connected to actual ESP8266
// This function can be called from console for testing
function loadMockData() {
  const mockData = {
    temperature: 22 + Math.random() * 5,
    moisture: 45 + Math.random() * 20
  };
  
  updateSensorDisplays(mockData);
  updateCharts(mockData);
  generateCropRecommendations(mockData);
  
  const now = new Date().toLocaleTimeString();
  document.getElementById("tempLastUpdated").innerText = now;
  document.getElementById("moistureLastUpdated").innerText = now;
  
  showToast("Mock data loaded", "info");
  
  // Update dashboard values
  document.getElementById('dash-temp').textContent = mockData.temperature.toFixed(1) + '°C';
  document.getElementById('dash-moisture').textContent = mockData.moisture.toFixed(1) + '%';
}

// Add a debug console method for development
window.agriDebug = {
  version: '1.0.0',
  state: () => console.log(window.state),
  mock: loadMockData,
  setTimeframe: setTimeframe,
  toggleTheme: toggleTheme
};

console.log("Smart Agriculture Monitoring System loaded. For debugging, use window.agriDebug methods."); 