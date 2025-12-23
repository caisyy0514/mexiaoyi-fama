
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

// --- Zeabur 深度优化版 Redis 连接逻辑 ---
const getRedisConfig = () => {
  // 1. 优先尝试标准的 REDIS_URL
  if (process.env.REDIS_URL) {
    console.log('[Redis] Detected REDIS_URL from environment.');
    return process.env.REDIS_URL;
  }
  
  // 2. 适配 Zeabur 自动注入的变量 (HOST, PORT, PASSWORD)
  if (process.env.REDISHOST) {
    const host = process.env.REDISHOST;
    const port = process.env.REDISPORT || 6379;
    const password = process.env.REDISPASSWORD;
    
    console.log(`[Redis] Detected Zeabur Variables: ${host}:${port} (Password: ${password ? 'YES' : 'NO'})`);
    
    // 构建标准的 Redis 连接协议
    if (password) {
      return `redis://:${password}@${host}:${port}`;
    }
    return `redis://${host}:${port}`;
  }

  // 3. 本地开发降级
  return 'redis://127.0.0.1:6379';
};

let redis;
let isRedisReady = false;

// 模拟内存存储（降级方案）
const memoryStore = {
  config: null,
  codes: new Set(),
  claims: new Map()
};

const connectRedis = () => {
  const connectionString = getRedisConfig();
  
  try {
    redis = new Redis(connectionString, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 1000, 5000);
        if (times > 5) {
          console.log('[Redis] Max retries reached. Switching to Local Memory Mode.');
          return null; // 停止重试
        }
        return delay;
      },
      connectTimeout: 10000, // 10秒超时
    });

    redis.on('connect', () => {
      console.log('🚀 [Redis] Cloud Database Connected Successfully!');
      isRedisReady = true;
    });

    redis.on('error', (err) => {
      console.error('⚠️ [Redis] Connection Issue:', err.message);
      isRedisReady = false;
    });
  } catch (e) {
    console.error('❌ [Redis] Failed to initialize driver:', e.message);
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
  if (!codes || !Array.isArray(codes)) return res.status(400).json({ error: 'Invalid codes' });
  
  try {
    if (isRedisReady) {
      const pipeline = redis.pipeline();
      // 使用 sadd 批量添加
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
  if (!userId) return res.status(400).json({ error: 'UserID required' });

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
    
    if (!code) return res.status(404).json({ error: '库存已告罄' });
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
  console.log(`\n✅ SYSTEM READY: http://localhost:${port}`);
  console.log(`🌍 ENVIRONMENT: ${process.env.NODE_ENV || 'production'}`);
  console.log(`💡 NOTE: If you are using Zeabur, Redis status will appear in logs above.\n`);
});
