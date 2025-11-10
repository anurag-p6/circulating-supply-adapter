const axios = require('axios');

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

/**
 * Fetch supply data for BTC and ETH from CoinGecko
 * @returns {Promise<Object>} Supply data for BTC and ETH
 */
async function getSupplyFromCoinGecko() {
  try {
    const response = await axios.get(`${COINGECKO_API_URL}/simple/price`, {
      params: {
        ids: 'bitcoin,ethereum',
        vs_currencies: 'usd',
        include_market_cap: true,
        include_circulating_supply: true,
        include_total_supply: true,
        include_max_supply: true,
        x_cg_pro_api_key: COINGECKO_API_KEY
      }
    });

    const data = response.data;

    return {
      source: 'CoinGecko',
      timestamp: new Date().toISOString(),
      BTC: {
        symbol: 'BTC',
        circulatingSupply: data.bitcoin.circulating_supply,
        totalSupply: data.bitcoin.total_supply,
        maxSupply: data.bitcoin.max_supply,
        price: data.bitcoin.usd
      },
      ETH: {
        symbol: 'ETH',
        circulatingSupply: data.ethereum.circulating_supply,
        totalSupply: data.ethereum.total_supply,
        maxSupply: data.ethereum.max_supply,
        price: data.ethereum.usd
      }
    };
  } catch (error) {
    throw new Error(`CoinGecko API Error: ${error.message}`);
  }
}

/**
 * Fetch top 100 cryptocurrencies with supply and price data from CoinGecko
 * Uses CoinGecko's market data endpoint (public, no auth required but key is sent if available)
 * @returns {Promise<Array>} Array of top 100 cryptos with supply data
 */
async function getTopCryptosFromCoinGecko() {
  try {
    const params = {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: 100,
      page: 1,
      sparkline: false,
      locale: 'en'
    };

    // Add API key if available (for pro endpoints)
    if (COINGECKO_API_KEY) {
      params.x_cg_pro_api_key = COINGECKO_API_KEY;
    }

    const response = await axios.get(`${COINGECKO_API_URL}/coins/markets`, {
      params,
      timeout: 10000
    });

    const data = response.data;

    return data.map(crypto => ({
      rank: crypto.market_cap_rank,
      name: crypto.name,
      symbol: crypto.symbol?.toUpperCase() || null,
      price_usd: crypto.current_price || null,
      market_cap_usd: crypto.market_cap || null,
      circulating_supply: crypto.circulating_supply ? Math.floor(crypto.circulating_supply) : null
    }));
  } catch (error) {
    throw new Error(`CoinGecko Top 100 API Error: ${error.message}`);
  }
}

module.exports = {
  getSupplyFromCoinGecko,
  getTopCryptosFromCoinGecko
};