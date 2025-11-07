const NodeCache = require('node-cache');

/**
 * In-memory cache utility with 5-minute TTL
 * Reduces API calls and prevents rate limiting
 */
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {any} Cached value or undefined
 */
function get(key) {
  return cache.get(key);
}

/**
 * Set cached value
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Optional custom TTL in seconds (default: 300)
 */
function set(key, value, ttl = 300) {
  cache.set(key, value, ttl);
}

/**
 * Delete cached value
 * @param {string} key - Cache key
 */
function del(key) {
  cache.del(key);
}

/**
 * Clear all cache
 */
function flush() {
  cache.flushAll();
}

/**
 * Get cache stats
 * @returns {Object} Cache statistics
 */
function getStats() {
  return cache.getStats();
}

module.exports = {
  get,
  set,
  del,
  flush,
  getStats
};
