require('dotenv').config();
const express = require('express');
const supplyRoutes = require('./routes/supply');
const apiRoutes = require('./routes/api');
require('./services/supplyUpdater.service.js'); // Ensure the supply updater service is imported and runs

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/supply', supplyRoutes);
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Crypto Supply Data API',
    endpoints: {
      health: 'GET /health',
      top100: 'GET /api/top100',
      top100_refresh: 'POST /api/top100/refresh',
      coinmarketcap: 'GET /supply/coinmarketcap',
      coingecko: 'GET /supply/coingecko',
      both: 'GET /supply/both'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  GET /                       - API info`);
  console.log(`  GET /health                 - Health check`);
  console.log(`  GET /api/top100             - Top 100 cryptos with median supply (cached)`);
  console.log(`  POST /api/top100/refresh    - Manually refresh top 100 cache`);
  console.log(`  GET /supply/coinmarketcap   - CoinMarketCap supply data (legacy)`);
  console.log(`  GET /supply/coingecko       - CoinGecko supply data (legacy)`);
  console.log(`  GET /supply/both            - Both APIs supply data (legacy)`);
});

module.exports = app;