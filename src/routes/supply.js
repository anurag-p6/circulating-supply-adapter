const express = require('express');
const { getSupplyFromCoinMarketCap } = require('../apis/coinmarketcap');
const { getSupplyFromCoinGecko } = require('../apis/coingecko');

const router = express.Router();

/**
 * GET /supply/coinmarketcap
 * Fetch BTC and ETH supply from CoinMarketCap
 */
router.get('/coinmarketcap', async (req, res) => {
  try {
    const data = await getSupplyFromCoinMarketCap();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /supply/coingecko
 * Fetch BTC and ETH supply from CoinGecko
 */
router.get('/coingecko', async (req, res) => {
  try {
    const data = await getSupplyFromCoinGecko();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /supply/both
 * Fetch BTC and ETH supply from both APIs
 */
router.get('/both', async (req, res) => {
  try {
    const [cmcData, cgData] = await Promise.all([
      getSupplyFromCoinMarketCap(),
      getSupplyFromCoinGecko()
    ]);

    res.json({
      success: true,
      data: {
        coinmarketcap: cmcData,
        coingecko: cgData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;