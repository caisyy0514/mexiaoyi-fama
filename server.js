
const express = require('express');
const Redis = require('ioredis');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { transform } = require('sucrase');

const app = express();
const port = process.env.PORT || 8080;

// --- 实时转译中间件 ---
app.get(/\.(tsx|ts)$/, (req, res, next) => {
  const filePath = path.join(__dirname, req.path);
  if (fs.existsSync(filePath)) {
    try {
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const { code } = transform(rawContent, {
        transforms: ['typescript', 'jsx'],
        jsxRuntime: 'classic',
      });
      res.set('Content-Type', 'application/javascript');
      return res.send(code);
    } catch (err) {
      console.error(`[Transpiler] Error in ${req.path}:`, err.message);
      return res.status(500).send(`console.error("Transpilation Error in ${req.path}");`);
    }
  }
  next();
});

// --- 增强型 Redis 连接逻辑 ---
// 自动适配多种云环境的变量名
const redisConfig = {
  url: process.env.REDIS_URL || (process.env.REDISHOST ? `redis://${process.env.REDISHOST}:${process.env.REDISPORT || 6379}` : null) || 'redis://localhost:6379',
  maxRetries: 2
};

let redis;
let isRedisReady = false;

const memoryStore = {
  config: null,
  codes: new Set(),
  claims: new Map()
};

const connectRedis = () => {
  try {
    redis = new Redis(redisConfig.url, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > redisConfig.maxRetries) {
          console.log(`[Redis] Connection timed out after ${times} attempts. Priority: Memory Mode.`);
          return null; 
        }
        return 2000;
      },
      reconnectOnError: () => false
    });

    redis.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.log(`[Redis] Standby: Could not connect to ${redisConfig.url}. Operational in Local Mode.`);
      } else {
        console.error('[Redis] System Error:', err.message || err);
      }
      isRedisReady = false;
    });

    redis.on('connect', () => {
      console.log(`[Redis] Cloud Engine Activated: Connected to ${redisConfig.url.split('@').pop()}`);
      isRedisReady = true;
    });
  } catch (e) {
    console.log('[Redis] Driver initialization failed. Using In-memory persistence.');
  }
};

connectRedis();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// --- API 路由 ---
app.get('/api/config', async (req, res) => {
  try {
    let data = isRedisReady ? await redis.get('m_portal:config') : memoryStore.config;
    res.json(data ? (typeof data === 'string' ? JSON.parse(data) : data) : null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/config', async (req, res) => {
  try {
    if (isRedisReady) await redis.set('m_portal:config', JSON.stringify(req.body));
    else memoryStore.config = req.body;
    res.json({ success: true, mode: isRedisReady ? 'cloud' : 'local' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/codes/upload', async (req, res) => {
  const { codes } = req.body;
  try {
    if (isRedisReady) {
      // 批量写入，优化性能
      const pipeline = redis.pipeline();
      pipeline.sadd('m_portal:codes:available', ...codes);
      await pipeline.exec();
    } else {
      codes.forEach(c => memoryStore.codes.add(c));
    }
    res.json({ success: true, count: codes.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/claim', async (req, res) => {
  const { userId } = req.body;
  try {
    let existing = isRedisReady ? await redis.hget('m_portal:claims', userId) : memoryStore.claims.get(userId);
    if (existing) return res.json({ code: existing });

    let code;
    if (isRedisReady) {
      code = await redis.spop('m_portal:codes:available');
      if (code) await redis.hset('m_portal:claims', userId, code);
    } else {
      const it = memoryStore.codes.values().next();
      code = it.value;
      if (code) {
        memoryStore.codes.delete(code);
        memoryStore.claims.set(userId, code);
      }
    }
    if (!code) return res.status(404).json({ error: '权益已领罄' });
    res.json({ code });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stats', async (req, res) => {
  try {
    if (isRedisReady) {
      const available = await redis.scard('m_portal:codes:available');
      const claimed = await redis.hlen('m_portal:claims');
      res.json({ total: available + claimed, claimed, cloud: true });
    } else {
      res.json({ total: memoryStore.codes.size + memoryStore.claims.size, claimed: memoryStore.claims.size, cloud: false });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reset', async (req, res) => {
  try {
    if (isRedisReady) await redis.del('m_portal:config', 'm_portal:codes:available', 'm_portal:claims');
    else { memoryStore.config = null; memoryStore.codes.clear(); memoryStore.claims.clear(); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`\n✅ SERVICE ONLINE: http://localhost:${port}`);
  console.log(`📡 CLOUD_MODE: ${isRedisReady ? 'ACTIVE' : 'READY (Local Persistence)'}\n`);
});
