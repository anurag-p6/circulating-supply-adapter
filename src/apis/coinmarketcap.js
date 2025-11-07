const axios = require('axios');

const CMC_API_URL = 'https://pro-api.coinmarketcap.com/v1';
const CMC_API_KEY = process.env.COINMARKETCAP_API_KEY;

/**
 * Fetch supply data for BTC and ETH from CoinMarketCap
 * @returns {Promise<Object>} Supply data for BTC and ETH
 */
async function getSupplyFromCoinMarketCap() {
  try {
    const response = await axios.get(`${CMC_API_URL}/cryptocurrency/quotes/latest`, {
      params: {
        symbol: 'BTC,ETH',
        convert: 'USD'
      },
      headers: {
        'X-CMC_PRO_API_KEY': CMC_API_KEY
      }
    });

    const data = response.data.data;

    return {
      source: 'CoinMarketCap',
      timestamp: new Date().toISOString(),
      BTC: {
        symbol: 'BTC',
        circulatingSupply: data.BTC.circulating_supply,
        totalSupply: data.BTC.total_supply,
        maxSupply: data.BTC.max_supply,
        price: data.BTC.quote.USD.price
      },
      ETH: {
        symbol: 'ETH',
        circulatingSupply: Math.floor(data.ETH.circulating_supply),
        totalSupply: Math.floor(data.ETH.total_supply),
        maxSupply: Math.floor(data.ETH.max_supply),
        price: Math.floor(data.ETH.quote.USD.price)
      }
    };
  } catch (error) {
    throw new Error(`CoinMarketCap API Error: ${error.message}`);
  }
}

/**
 * Fetch top 100 cryptocurrencies with supply and price data from CoinMarketCap
 * @returns {Promise<Array>} Array of top 100 cryptos with supply data
 */
async function getTopCryptosFromCoinMarketCap() {
  try {
    const response = await axios.get(`${CMC_API_URL}/cryptocurrency/listings/latest`, {
      params: {
        limit: 100,
        convert: 'USD',
        sort: 'market_cap',
        sort_dir: 'desc'
      },
      headers: {
        'X-CMC_PRO_API_KEY': CMC_API_KEY
      },
      timeout: 10000
    });

    const data = response.data.data;

    return data.map(crypto => ({
      rank: crypto.cmc_rank,
      name: crypto.name,
      symbol: crypto.symbol,
      price_usd: crypto.quote?.USD?.price || null,
      market_cap_usd: crypto.quote?.USD?.market_cap || null,
      circulating_supply: crypto.circulating_supply || null
    }));
  } catch (error) {
    throw new Error(`CoinMarketCap Top 100 API Error: ${error.message}`);
  }
}

module.exports = {
  getSupplyFromCoinMarketCap,
  getTopCryptosFromCoinMarketCap
};