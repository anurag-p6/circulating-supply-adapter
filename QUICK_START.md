# Quick Start Guide

## 1. Install Dependencies
```bash
pnpm install
```

## 2. Start Development Server
```bash
pnpm dev
```

Server runs on `http://localhost:3000`

## 3. Test the API

### Get Top 100 Cryptos (Cached)
```bash
curl http://localhost:3000/api/top100
```

### Refresh Cache Manually
```bash
curl -X POST http://localhost:3000/api/top100/refresh
```

### Health Check
```bash
curl http://localhost:3000/health
```

## 4. API Response Example

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

## 5. Key Features

✅ **Dual API Integration**: CoinMarketCap + CoinGecko
✅ **Median Calculation**: Average circulating supply from both sources
✅ **Smart Caching**: 5-minute cache to prevent rate limiting
✅ **Parallel Fetching**: Fast data retrieval (~2-5s)
✅ **Fallback Logic**: Uses alternative API if one fails
✅ **Error Handling**: Comprehensive error management
✅ **Health Monitoring**: Built-in health endpoint

## 6. Deployment

### Heroku
```bash
# Set environment variables
heroku config:set COINMARKETCAP_API_KEY=your_key
heroku config:set COINGECKO_API_KEY=your_key

# Deploy
git push heroku main
```

### Docker
```bash
docker build -t price-adapter .
docker run -e COINMARKETCAP_API_KEY=your_key -p 3000:3000 price-adapter
```

## 7. New Files Created

| File | Purpose |
|------|---------|
| `src/routes/api.js` | Top 100 API endpoints |
| `src/services/dataService.js` | Data aggregation & median logic |
| `src/utils/cache.js` | Caching utility |
| `Procfile` | Heroku deployment |
| `README.md` | Full documentation |

## 8. Updated Files

| File | Changes |
|------|---------|
| `src/index.js` | Added API routes integration |
| `src/apis/coinmarketcap.js` | Added top 100 fetch function |
| `src/apis/coingecko.js` | Added top 100 fetch function |
| `package.json` | Added node-cache, updated config |

## 9. Environment Variables (.env)

```
COINMARKETCAP_API_KEY=your_key_here
COINGECKO_API_KEY=your_key_here
PORT=3000
```

## 10. Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/health` | GET | Health check |
| `/api/top100` | GET | Top 100 cryptos (cached) |
| `/api/top100/refresh` | POST | Force cache refresh |
| `/supply/coinmarketcap` | GET | BTC/ETH CMC data (legacy) |
| `/supply/coingecko` | GET | BTC/ETH CoinGecko data (legacy) |
| `/supply/both` | GET | BTC/ETH both APIs (legacy) |

---

For detailed information, see [README.md](./README.md)
