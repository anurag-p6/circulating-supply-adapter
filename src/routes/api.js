const express = require('express');
const { getTop100WithMedianSupply, clearCache } = require('../services/dataService');

const router = express.Router();

/**
 * GET /api/top100
 * Fetch top 100 cryptocurrencies with median circulating supply
 * Returns cached data if available (5-minute TTL)
 */
router.get('/top100', async (req, res) => {
  try {
    const data = await getTop100WithMedianSupply();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Error in /api/top100:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top 100 cryptocurrencies',
      message: error.message
    });
  }
});

/**
 * POST /api/top100/refresh
 * Manually refresh the cache for top 100 cryptos
 * Useful for forcing immediate data update
 */
router.post('/top100/refresh', async (req, res) => {
  try {
    clearCache();
    const data = await getTop100WithMedianSupply();
    res.json({
      success: true,
      message: 'Cache refreshed successfully',
      timestamp: new Date().toISOString(),
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Error in /api/top100/refresh:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh top 100 cryptocurrencies',
      message: error.message
    });
  }
});

module.exports = router;
