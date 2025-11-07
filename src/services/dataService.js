const { getTopCryptosFromCoinMarketCap } = require('../apis/coinmarketcap');
const { getTopCryptosFromCoinGecko } = require('../apis/coingecko');
const cache = require('../utils/cache');

const CACHE_KEY_TOP_100 = 'top_100_cryptos_median';

/**
 * Calculate median of two values (for two numbers, median = average)
 * @param {number} val1 - First value
 * @param {number} val2 - Second value
 * @returns {number|null} Median rounded to nearest integer, or null if both are invalid
 */
function calculateMedian(val1, val2) {
  const isVal1Valid = val1 !== null && val1 !== undefined && !isNaN(val1);
  const isVal2Valid = val2 !== null && val2 !== undefined && !isNaN(val2);

  if (isVal1Valid && isVal2Valid) {
    // Both values valid: return average rounded to nearest integer
    return Math.round((val1 + val2) / 2);
  } else if (isVal1Valid) {
    // Only first value valid
    return Math.round(val1);
  } else if (isVal2Valid) {
    // Only second value valid
    return Math.round(val2);
  } else {
    // Both invalid
    return null;
  }
}

/**
 * Fetch and process top 100 cryptocurrencies from both APIs
 * Computes median circulating supply and caches results for 5 minutes
 * @returns {Promise<Array>} Array of top 100 cryptos with median supply data
 */
async function getTop100WithMedianSupply() {
  // Check cache first
  const cachedData = cache.get(CACHE_KEY_TOP_100);
  if (cachedData) {
    console.log('Returning cached top 100 cryptos data');
    return cachedData;
  }

  try {
    console.log('Fetching top 100 cryptos from both APIs...');

    // Fetch from both APIs in parallel
    const [cmcData, cgData] = await Promise.all([
      getTopCryptosFromCoinMarketCap().catch(err => {
        console.error('CMC fetch error:', err.message);
        return null;
      }),
      getTopCryptosFromCoinGecko().catch(err => {
        console.error('CoinGecko fetch error:', err.message);
        return null;
      })
    ]);

    // Validate that at least one API succeeded
    if (!cmcData && !cgData) {
      throw new Error('Both APIs failed. Unable to fetch cryptocurrency data.');
    }

    // Merge and process data
    const processedData = mergeAndProcessData(cmcData, cgData);

    // Cache the result (5 minutes = 300 seconds)
    cache.set(CACHE_KEY_TOP_100, processedData, 300);

    console.log(`Successfully processed ${processedData.length} cryptocurrencies`);
    return processedData;
  } catch (error) {
    console.error('Error in getTop100WithMedianSupply:', error.message);
    throw error;
  }
}

/**
 * Merge data from both APIs and compute median circulating supply
 * @param {Array|null} cmcData - Data from CoinMarketCap
 * @param {Array|null} cgData - Data from CoinGecko
 * @returns {Array} Processed data with median values
 */
function mergeAndProcessData(cmcData, cgData) {
  // Create a map to combine data by symbol
  const cryptoMap = new Map();

  // Process CoinMarketCap data
  if (cmcData && Array.isArray(cmcData)) {
    cmcData.forEach(crypto => {
      cryptoMap.set(crypto.symbol, {
        rank: crypto.rank,
        name: crypto.name,
        symbol: crypto.symbol,
        price_usd: crypto.price_usd,
        market_cap_usd: crypto.market_cap_usd,
        cmc_supply: crypto.circulating_supply,
        cg_supply: null,
        circulating_supply_median: null
      });
    });
  }

  // Merge CoinGecko data
  if (cgData && Array.isArray(cgData)) {
    cgData.forEach(crypto => {
      if (cryptoMap.has(crypto.symbol)) {
        // Update existing entry with CoinGecko data
        const entry = cryptoMap.get(crypto.symbol);
        entry.cg_supply = crypto.circulating_supply;
        entry.circulating_supply_median = calculateMedian(
          entry.cmc_supply,
          entry.cg_supply
        );
      } else {
        // Add new entry (only from CoinGecko)
        cryptoMap.set(crypto.symbol, {
          rank: crypto.rank,
          name: crypto.name,
          symbol: crypto.symbol,
          price_usd: crypto.price_usd,
          market_cap_usd: crypto.market_cap_usd,
          cmc_supply: null,
          cg_supply: crypto.circulating_supply,
          circulating_supply_median: calculateMedian(null, crypto.circulating_supply)
        });
      }
    });
  }

  // Only CMC data available - calculate median from single source
  if (cmcData && !cgData) {
    cryptoMap.forEach(entry => {
      if (entry.circulating_supply_median === null) {
        entry.circulating_supply_median = calculateMedian(entry.cmc_supply, null);
      }
    });
  }

  // Convert to array and sort by rank
  const result = Array.from(cryptoMap.values())
    .filter(crypto => crypto.circulating_supply_median !== null) // Skip if no valid supply data
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 100) // Limit to top 100
    .map(crypto => ({
      rank: crypto.rank,
      name: crypto.name,
      symbol: crypto.symbol,
      price_usd: crypto.price_usd,
      market_cap_usd: crypto.market_cap_usd,
      circulating_supply_median: crypto.circulating_supply_median
    }));

  return result;
}

/**
 * Clear cached top 100 data (useful for manual refresh)
 */
function clearCache() {
  cache.del(CACHE_KEY_TOP_100);
  console.log('Cache cleared for top 100 cryptos');
}

module.exports = {
  getTop100WithMedianSupply,
  calculateMedian,
  clearCache
};
