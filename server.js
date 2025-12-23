
const express = require('express');
const Redis = require('ioredis');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// 显式设置 MIME 类型，防止浏览器因 'text/plain' 拒绝执行模块
express.static.mime.define({
  'application/javascript': ['ts', 'tsx', 'js', 'jsx']
});

// --- Redis 连接与容错处理 ---
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let redis;
let isRedisReady = false;

// 内存备份存储（当 Redis 不可用时）
const memoryStore = {
  config: null,
  codes: new Set(),
  claims: new Map()
};

try {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 3) {
        console.warn('[ioredis] Max retries reached. Switching to memory fallback.');
        return null; // 停止重试
      }
      return 2000;
    }
  });

  redis.on('error', (err) => {
    console.error('[ioredis] Connection Error:', err.message);
    isRedisReady = false;
  });

  redis.on('connect', () => {
    console.log('[ioredis] Connected to Redis successfully');
    isRedisReady = true;
  });
} catch (e) {
  console.error('[ioredis] Failed to initialize Redis client:', e.message);
}

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// 静态文件服务配置
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

const KEYS = {
  CONFIG: 'm_portal:config',
  CODES_AVAILABLE: 'm_portal:codes:available',
  CLAIMS: 'm_portal:claims'
};

// --- API 实现（带回退逻辑） ---

app.get('/api/config', async (req, res) => {
  try {
    let data = isRedisReady ? await redis.get(KEYS.CONFIG) : memoryStore.config;
    res.json(data ? (typeof data === 'string' ? JSON.parse(data) : data) : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const config = req.body;
    if (isRedisReady) {
      await redis.set(KEYS.CONFIG, JSON.stringify(config));
    } else {
      memoryStore.config = config;
    }
    res.json({ success: true, mode: isRedisReady ? 'redis' : 'memory' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/codes/upload', async (req, res) => {
  const { codes } = req.body;
  if (!Array.isArray(codes) || codes.length === 0) return res.status(400).json({ error: '无效码' });
  try {
    if (isRedisReady) {
      await redis.sadd(KEYS.CODES_AVAILABLE, ...codes);
    } else {
      codes.forEach(c => memoryStore.codes.add(c));
    }
    res.json({ success: true, count: codes.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/claim', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'ID缺失' });
  try {
    // 检查是否已领
    let existingCode = isRedisReady 
      ? await redis.hget(KEYS.CLAIMS, userId) 
      : memoryStore.claims.get(userId);
    
    if (existingCode) return res.json({ code: existingCode });

    // 弹出新码
    let code;
    if (isRedisReady) {
      code = await redis.spop(KEYS.CODES_AVAILABLE);
      if (code) await redis.hset(KEYS.CLAIMS, userId, code);
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
      const available = await redis.scard(KEYS.CODES_AVAILABLE);
      const claimed = await redis.hlen(KEYS.CLAIMS);
      res.json({ total: available + claimed, claimed, cloud: true });
    } else {
      res.json({ 
        total: memoryStore.codes.size + memoryStore.claims.size, 
        claimed: memoryStore.claims.size,
        cloud: false 
      });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reset', async (req, res) => {
  try {
    if (isRedisReady) {
      await redis.del(KEYS.CONFIG, KEYS.CODES_AVAILABLE, KEYS.CLAIMS);
    } else {
      memoryStore.config = null;
      memoryStore.codes.clear();
      memoryStore.claims.clear();
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('*', (req, res) => {
  if (req.path.includes('.') && !req.path.endsWith('.html')) {
    res.status(404).send('File Not Found');
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(port, () => {
  console.log(`>>> Server is running at http://localhost:${port}`);
  console.log(`>>> Redis Status: ${isRedisReady ? 'CONNECTED' : 'STANDBY / MEMORY MODE'}`);
});
