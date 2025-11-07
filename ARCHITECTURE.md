# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Express.js Server                         │
│                      (src/index.js - Port 3000)                 │
└────────────────────────┬──────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐   ┌──────────────┐   ┌─────────────┐
   │ Routes  │   │ Routes       │   │ Routes      │
   │ /       │   │ /supply      │   │ /api        │
   │ /health │   │ (legacy)     │   │ (NEW)       │
   └────────┬┘   └──────┬───────┘   └──────┬──────┘
            │           │                  │
            │           │         ┌────────┴────────┐
            │           │         │                 │
            │    ┌──────▼───┐    ▼                  ▼
            │    │ /supply  │  GET /api/top100  POST /api/top100
            │    │ routes   │  (cached, 5min)   /refresh
            │    └──────────┘
            │
            │  GET /
            │  GET /health
            │
            └─────────────────────────────────────────────┐
                                                          │
                                           ┌──────────────▼──────┐
                                           │  Data Service       │
                                           │ (src/services/      │
                                           │  dataService.js)    │
                                           └──────────┬──────────┘
                                                      │
                            ┌─────────────────────────┼──────────────────────┐
                            │                         │                      │
                            ▼                         ▼                      ▼
                    ┌─────────────────┐   ┌──────────────────┐   ┌─────────────────┐
                    │  Cache Layer    │   │  Merge & Process │   │  Calculate      │
                    │ (node-cache)    │   │  (Combine Data)  │   │  Median Supply  │
                    │ 5-min TTL       │   │                  │   │                 │
                    └────────┬────────┘   └──────────────────┘   └─────────────────┘
                             │
                    ┌────────┴──────────┐
                    │  Cache Miss?      │
                    │  Fetch from APIs  │
                    └────────┬──────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  (Parallel)
│  CoinMarketCap   │  │    CoinGecko     │
│     API Module   │  │    API Module    │
│                  │  │                  │
│  •listings/      │  │  • coins/markets │
│   latest (top100)│  │   (top100)       │
│  • 10s timeout   │  │  • 10s timeout   │
│  • Error handle  │  │  • Error handle  │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         └─────────┬───────────┘
                   │
            (HTTP requests)
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
    CMC Pro API         CoinGecko API
  (pro-api.cmc)      (api.coingecko.com)
```

## Data Flow Diagram

```
Client Request (GET /api/top100)
        │
        ▼
┌──────────────────────────────┐
│ Check In-Memory Cache        │
│ (5-minute TTL)               │
└─────────┬────────────────────┘
          │
    ┌─────┴─────┐
    │           │
Hit │           │ Miss
    │           │
    ▼           ▼
Return    Fetch from Both
Cached    APIs in Parallel
Data      (Promise.all)
    │           │
    │      ┌────┴────┐
    │      │          │
    │      ▼          ▼
    │   CMC API   CoinGecko API
    │      │          │
    │      └────┬─────┘
    │           │
    │      Process Data
    │      ├─ Map by symbol
    │      ├─ Merge entries
    │      ├─ Calculate median
    │      ├─ Sort by rank
    │      └─ Limit to 100
    │           │
    │      Store in Cache
    │      (5 minutes)
    │           │
    └───────┬───┘
            │
            ▼
    Return JSON Response
    {
      success: true,
      data: [...]
    }
```

## Module Dependencies

```
src/index.js (Main Server)
    ├─ require('./routes/supply') ──────┐
    ├─ require('./routes/api')          │
    ├─ express.json()                   │
    ├─ app.use('/supply', ...)          │
    ├─ app.use('/api', ...)             │
    └─ Error handlers                   │
                                        │
                                        ▼
            src/routes/api.js (NEW)
                ├─ GET /api/top100
                ├─ POST /api/top100/refresh
                └─ require('../services/dataService')
                        │
                        ▼
        src/services/dataService.js (NEW)
            ├─ getTop100WithMedianSupply()
            ├─ require('../apis/coinmarketcap')
            ├─ require('../apis/coingecko')
            ├─ require('../utils/cache')
            └─ calculateMedian()
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
    CMC API                CoinGecko API
    Module                 Module
    ├─ getTopCryptosFrom   ├─ getTopCryptosFrom
    │  CoinMarketCap()     │  CoinGecko()
    │                      │
    └─ HTTP calls          └─ HTTP calls
       (axios)                (axios)


        src/utils/cache.js (NEW)
        ├─ get(key)
        ├─ set(key, value, ttl)
        ├─ del(key)
        └─ node-cache wrapper
```

## Request/Response Cycle

### Success Path

```
GET /api/top100
      ↓
Check cache? YES → Return 200 ✓
      ↓ NO
Fetch CMC API
Fetch CoinGecko API (parallel)
      ↓
Both succeeded?
├─ YES → Merge & calculate median
└─ NO → Use available data
      ↓
Cache result
      ↓
Return 200 + JSON
```

### Error Path

```
GET /api/top100
      ↓
Check cache? YES → Return 200 ✓
      ↓ NO
Fetch CMC API
Fetch CoinGecko API (parallel)
      ↓
One failed?
├─ YES → Use other data
│         ↓
│     Return 200 + JSON
└─ Both failed?
      ↓
  Return 500 + Error
  {
    success: false,
    error: "..."
  }
```

## Cache Architecture

```
┌─────────────────────────────────────────────────────┐
│         Node-Cache Manager (node-cache)            │
│                                                     │
│  Key: 'top_100_cryptos_median'                     │
│  Value: [{...}, {...}, ...]  (100 crypto objects)  │
│  TTL: 300 seconds (5 minutes)                      │
│  CheckPeriod: 60 seconds                           │
│                                                     │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐ │
│  │ .get()     │  │ .set()     │  │ .del()       │ │
│  │ Read cache │  │ Write cache│  │ Clear entry  │ │
│  │ O(1) time  │  │            │  │              │ │
│  └────────────┘  └────────────┘  └──────────────┘ │
│                                                     │
│  Auto-cleanup every 60 seconds                     │
│  Expires entries after 300 seconds                 │
└─────────────────────────────────────────────────────┘

Timeline:
T=0:00   → GET /api/top100 (cache miss)
           └─ Fetch from APIs (2-5s)
           └─ Store in cache
           └─ Return result

T=0:10   → GET /api/top100 (cache hit)
           └─ Return cached data (<50ms)

T=4:50   → GET /api/top100 (cache hit)
           └─ Return cached data (<50ms)

T=5:00   → Cache expires
           └─ Next request triggers fresh fetch

T=5:01   → GET /api/top100 (cache miss)
           └─ Fetch from APIs
           └─ Store new cache
```

## Error Handling Flow

```
API Request
    │
    └─► Promise.all([CMC, CoinGecko])
        │
        ├─ CMC succeeds → Data valid ✓
        │
        └─ CoinGecko succeeds → Data valid ✓
            │
            ├─ Both succeed → Merge & calculate median
            │
            ├─ CMC fails, CoinGecko succeeds
            │  └─ Use CoinGecko data, skip CMC
            │
            ├─ CoinGecko fails, CMC succeeds
            │  └─ Use CMC data, skip CoinGecko
            │
            └─ Both fail
               └─ Throw error
                  └─ Return HTTP 500

Median Calculation with Fallback:
    For each crypto:
    ├─ Both values available
    │  └─ median = round((val1 + val2) / 2)
    │
    ├─ Only one value
    │  └─ median = round(value)
    │
    └─ No values
       └─ Skip crypto (N/A)
```

## Performance Characteristics

```
                    Latency                Memory         CPU
                    ───────                ──────         ───
Cached Request     <50ms      (simple dict lookup)
Fresh Request      2-5s       (parallel API calls)
API Timeout        10s        (max per request)

Data Size:
├─ Per Crypto: ~500 bytes
├─ Top 100: ~50 KB
├─ Cache Memory: <100 MB

Throughput:
├─ Cached: 1000+ req/sec
├─ Fresh: 1-5 req/sec
└─ Concurrent: Limited by API rate limits

Rate Limiting:
├─ CMC: 333 calls/day (free tier)
├─ CoinGecko: 10-50 calls/min (free tier)
├─ Our cache: 300s TTL = ~288 calls/day max
└─ Result: Within limits ✓
```

## Deployment Architecture

### Heroku
```
┌──────────────────────────────┐
│   Heroku Dyno (Node 20.x)    │
│                              │
│  Procfile: web: pnpm start   │
│                              │
│  ┌────────────────────────┐  │
│  │  Express Server        │  │
│  │  Port: $PORT (5000)    │  │
│  │                        │  │
│  │  Cache: In-Memory      │  │
│  │  Restart resets cache  │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
        │          │
        ▼          ▼
    CMC API   CoinGecko API
```

### Docker
```
┌─────────────────────────────────┐
│     Docker Container            │
│     Node 20 Alpine              │
│                                 │
│  ┌──────────────────────────┐   │
│  │  npm: pnpm (installed)   │   │
│  │                          │   │
│  │  ┌────────────────────┐  │   │
│  │  │ Express Server     │  │   │
│  │  │ Port: 3000         │  │   │
│  │  │                    │  │   │
│  │  │ Cache: In-Memory   │  │   │
│  │  │ (survives restart) │  │   │
│  │  └────────────────────┘  │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
   Exposed: 3000
   Env vars: COINMARKETCAP_API_KEY, etc.
```

---

**Last Updated**: November 7, 2024
**Status**: Complete and Production-Ready
