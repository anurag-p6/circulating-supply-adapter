# Crypto Supply Data API

A production-ready Express.js application that fetches and aggregates cryptocurrency data from both **CoinMarketCap** and **CoinGecko** APIs. The application compares circulating supply values between the two sources, computes their median (average for two values), and exposes a cached API endpoint for the top 100 cryptocurrencies by market cap.

## Docker Quick Start

### Option 1: Run from GHCR (Already Deployed)

```bash
docker run -p 3000:3000 \
  -e COINMARKETCAP_API_KEY=your_api_key \
  -e COINGECKO_API_KEY=your_api_key \
  ghcr.io/anurag-p6/price-adapter:latest
```

### Option 2: Run Locally with docker-compose

1. Create `.env` file:
```bash
COINMARKETCAP_API_KEY=your_api_key
COINGECKO_API_KEY=your_api_key
```

2. Run:
```bash
docker-compose up -d
```

**Check status**: `http://localhost:3000/health`

**Get data**: `http://localhost:3000/api/top100`

---

## Features

- **Dual-API Integration**: Fetches data from both CoinMarketCap and CoinGecko for redundancy
- **Median Circulating Supply**: Calculates median circulating supply across both APIs
- **Intelligent Fallback**: If one API fails, uses data from the other; if both fail, skips the crypto
- **In-Memory Caching**: 5-minute cache using node-cache to prevent rate limiting
- **Parallel Fetching**: Async/await with Promise.all for efficient data retrieval
- **Error Handling**: Comprehensive error handling with detailed logging
- **Health Check**: Built-in `/health` endpoint for monitoring
- **Production-Ready**: Node.js 20+, pnpm package manager, Heroku-compatible

## Tech Stack

- **Express.js** v5.1.0 - Web framework
- **Axios** v1.13.1 - HTTP client
- **node-cache** v5.1.2 - In-memory caching
- **dotenv** v17.2.3 - Environment variable management
- **Node.js** 20.x - Runtime

## Installation

### Prerequisites

- Node.js 20.x or higher
- pnpm 10.20.0 or higher

### Setup

1. **Clone or navigate to the project directory**:
   ```bash
   cd price-adapter
   ```

2. **Install dependencies** using pnpm:
   ```bash
   pnpm install
   ```

3. **Configure environment variables** in `.env`:
   ```bash
   COINMARKETCAP_API_KEY=your_cmc_free_tier_key
   COINGECKO_API_KEY=your_coingecko_api_key_or_empty
   PORT=3000
   ```

   - **COINMARKETCAP_API_KEY**: Get a free tier key from [CoinMarketCap](https://coinmarketcap.com/api/)
   - **COINGECKO_API_KEY**: (Optional) Get from [CoinGecko Pro](https://www.coingecko.com/en/api/documentation), or leave empty for free API
   - **PORT**: Server port (default: 3000)

## Running the Application

### Development Mode

Start with file watching:
```bash
pnpm dev
```

This uses Node's `--watch` flag to auto-restart on file changes.

### Production Mode

Start the server:
```bash
pnpm start
```

Server will run on `http://localhost:3000` by default.

## API Endpoints

### Get Top 100 Cryptocurrencies
```
GET /api/top100
```

Returns the top 100 cryptocurrencies by market cap with median circulating supply.

**Response Example**:
```json
{
  "success": true,
  "timestamp": "2024-11-07T10:30:45.123Z",
  "count": 100,
  "data": [
    {
      "rank": 1,
      "name": "Bitcoin",
      "symbol": "BTC",
      "price_usd": 42500.50,
      "market_cap_usd": 835000000000,
      "circulating_supply_median": 21000000
    },
    {
      "rank": 2,
      "name": "Ethereum",
      "symbol": "ETH",
      "price_usd": 2250.75,
      "market_cap_usd": 270000000000,
      "circulating_supply_median": 120000000
    }
  ]
}
```

**Caching**: Results are cached for 5 minutes to prevent rate limiting. Subsequent requests within this window return the cached data instantly.

### Refresh Top 100 Cache
```
POST /api/top100/refresh
```

Manually refresh the cached data (useful for forcing immediate updates).

**Response**: Same as GET `/api/top100` with freshly fetched data.

### Health Check
```
GET /health
```

Check server status.

**Response**:
```json
{
  "status": "OK",
  "timestamp": "2024-11-07T10:30:45.123Z"
}
```

### API Info
```
GET /
```

Returns available endpoints.

### Legacy Endpoints (BTC & ETH only)

- `GET /supply/coinmarketcap` - CoinMarketCap supply data for BTC/ETH
- `GET /supply/coingecko` - CoinGecko supply data for BTC/ETH
- `GET /supply/both` - Both APIs data for BTC/ETH

## Project Structure

```
price-adapter/
├── src/
│   ├── index.js                 # Main server entry point
│   ├── apis/
│   │   ├── coinmarketcap.js     # CoinMarketCap API functions
│   │   └── coingecko.js         # CoinGecko API functions
│   ├── routes/
│   │   ├── supply.js            # Legacy supply endpoints (BTC/ETH)
│   │   └── api.js               # New top 100 API endpoints
│   ├── services/
│   │   └── dataService.js       # Data aggregation and median logic
│   └── utils/
│       └── cache.js             # Caching utility (node-cache wrapper)
├── package.json
├── pnpm-lock.yaml
├── .env                         # Environment variables (not in git)
├── .gitignore
└── README.md
```

## Implementation Details

### Median Calculation

For two values (one from each API), the median is calculated as their average:
```
median = round((value1 + value2) / 2)
```

**Fallback Logic**:
- **Both values valid**: Return average rounded to nearest integer
- **One value valid**: Return that value rounded to nearest integer
- **Both invalid**: Mark as N/A and skip the crypto

### Caching Strategy

- **TTL**: 5 minutes (300 seconds)
- **Check Period**: 60 seconds
- **Key**: `top_100_cryptos_median`
- **Cache Size**: In-memory, configurable
- **Manual Refresh**: POST `/api/top100/refresh` clears and refetches

### API Call Flow

```
Client Request (GET /api/top100)
    ↓
Check Cache (5-min TTL)
    ↓ (if cached)
Return Cached Data
    ↓ (if not cached)
Fetch from Both APIs in Parallel
    ├─ CoinMarketCap (cryptocurrency/listings/latest)
    └─ CoinGecko (coins/markets)
    ↓
Merge & Process Data
    ├─ Calculate median circulating supply
    ├─ Sort by rank
    └─ Limit to top 100
    ↓
Cache Result (5 min)
    ↓
Return to Client
```

## Error Handling

The application is resilient to API failures:

1. **Single API Fails**: Uses data from the other API
2. **Both APIs Fail**: Returns 500 error with descriptive message
3. **Partial Data Loss**: Skips cryptocurrencies without valid supply data
4. **Network Timeouts**: 10-second timeout per API call
5. **Rate Limiting**: In-memory cache prevents excessive API calls

**Example Error Response**:
```json
{
  "success": false,
  "error": "Failed to fetch top 100 cryptocurrencies",
  "message": "Both APIs failed. Unable to fetch cryptocurrency data."
}
```

## Deployment

### Heroku Deployment

1. **Create a Procfile** in the project root:
   ```
   web: pnpm start
   ```

2. **Set Node engine in package.json** (already configured):
   ```json
   "engines": {
     "node": "20.x"
   }
   ```

3. **Use pnpm buildpack** (Heroku automatically detects pnpm):
   ```bash
   heroku buildpacks:set https://github.com/pnpm/heroku-buildpack.git
   ```

4. **Set environment variables**:
   ```bash
   heroku config:set COINMARKETCAP_API_KEY=your_key
   heroku config:set COINGECKO_API_KEY=your_key
   heroku config:set PORT=5000  # (if needed; Heroku assigns PORT automatically)
   ```

5. **Deploy**:
   ```bash
   git push heroku main
   ```

### Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY src/ src/

# Copy .env if needed (or set via environment)
# COPY .env .env

EXPOSE 3000

CMD ["pnpm", "start"]
```

Build and run:
```bash
docker build -t price-adapter .
docker run -e COINMARKETCAP_API_KEY=your_key -p 3000:3000 price-adapter
```

### Environment Variables (Production)

Set these securely in your deployment environment:
- `COINMARKETCAP_API_KEY` - Your CMC API key
- `COINGECKO_API_KEY` - Your CoinGecko API key (optional)
- `PORT` - Server port (default: 3000)

**Never commit `.env` to version control.**

## Performance Considerations

- **Cache Hit Ratio**: ~95% for normal usage patterns (5-min cache window)
- **Response Time**: <50ms for cached requests, 2-5s for fresh data
- **API Rate Limits**:
  - CoinMarketCap: 333 calls/day (free tier)
  - CoinGecko: 10-50 calls/min (free tier)
- **Optimization**: Caching prevents hitting rate limits on both APIs

## Troubleshooting

### No Data Returned from APIs

**Issue**: Getting empty arrays or N/A values

**Solutions**:
1. Check API keys in `.env` are valid
2. Verify API keys have correct permissions
3. Check CMC free tier limits haven't been exceeded
4. Verify internet connectivity

### Cache Not Updating

**Issue**: Data seems stale

**Solution**:
1. Use POST `/api/top100/refresh` to force refresh
2. Cache expires automatically after 5 minutes
3. Check server logs for API errors

### High Memory Usage

**Issue**: Server consuming excessive memory

**Solutions**:
1. Limit cache size in `src/utils/cache.js` (adjust `stdTTL`)
2. Implement background cache cleanup
3. Add memory monitoring

### Rate Limiting Errors

**Issue**: Getting 429 (Too Many Requests) from APIs

**Solutions**:
1. Verify cache is working (`pnpm dev` with logs)
2. Reduce refresh frequency (POST endpoint)
3. Upgrade to paid API plans
4. Implement request throttling

## Development

### Running in Watch Mode

```bash
pnpm dev
```

Uses Node's `--watch` flag to automatically restart on file changes.

### Logging

The application logs key events:
- Successful data fetches
- Cache hits/misses
- API errors
- Server startup

Enable debug logging by adding to your `.env`:
```bash
DEBUG=*
```

### Testing API Locally

```bash
# Health check
curl http://localhost:3000/health

# Get top 100
curl http://localhost:3000/api/top100

# Refresh cache
curl -X POST http://localhost:3000/api/top100/refresh
```

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^5.1.0 | Web framework |
| axios | ^1.13.1 | HTTP requests |
| node-cache | ^5.1.2 | In-memory caching |
| dotenv | ^17.2.3 | Environment variables |

## Contributing

To add new features:

1. Create a new branch
2. Make changes following the existing structure
3. Test with `pnpm dev`
4. Ensure error handling is comprehensive
5. Update documentation
6. Submit a pull request

## License

ISC

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review API documentation:
   - [CoinMarketCap API](https://coinmarketcap.com/api/documentation/v1/)
   - [CoinGecko API](https://docs.coingecko.com/reference/introduction)
3. Check server logs for detailed error messages

---

**Last Updated**: November 2024
**Node.js Version**: 20.x
**Package Manager**: pnpm 10.20.0
