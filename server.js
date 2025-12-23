
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
// 处理浏览器请求的 .tsx 和 .ts 文件，将其转译为 JS
app.get(/\.(tsx|ts)$/, (req, res, next) => {
  const filePath = path.join(__dirname, req.path);
  if (fs.existsSync(filePath)) {
    try {
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const { code } = transform(rawContent, {
        transforms: ['typescript', 'jsx'],
        jsxRuntime: 'classic', // 适配简单 ESM 环境
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

// --- Redis 连接与容错处理 ---
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let redis;
let isRedisReady = false;

const memoryStore = {
  config: null,
  codes: new Set(),
  claims: new Map()
};

try {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 2) return null; // 快速放弃，切换到内存模式
      return 1000;
    },
    // 抑制 AggregateError 报错
    reconnectOnError: () => false
  });

  redis.on('error', (err) => {
    // 简洁化报错
    if (err.code === 'ECONNREFUSED') {
      console.log(`[Redis] Connection refused at ${redisUrl}. Falling back to Memory Mode.`);
    } else {
      console.error('[Redis] Error:', err.message || err);
    }
    isRedisReady = false;
  });

  redis.on('connect', () => {
    console.log('[Redis] Status: CONNECTED');
    isRedisReady = true;
  });
} catch (e) {
  console.log('[Redis] Initialization skipped, using Memory Mode.');
}

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// 静态资源服务（常规文件）
app.use(express.static(__dirname));

// --- API 实现 ---
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
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/codes/upload', async (req, res) => {
  const { codes } = req.body;
  try {
    if (isRedisReady) await redis.sadd('m_portal:codes:available', ...codes);
    else codes.forEach(c => memoryStore.codes.add(c));
    res.json({ success: true });
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

// SPA 路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`\n🚀 Portal running at: http://localhost:${port}`);
  console.log(`📦 Persistence: ${isRedisReady ? 'Redis Cloud' : 'In-Memory Fallback'}\n`);
});
