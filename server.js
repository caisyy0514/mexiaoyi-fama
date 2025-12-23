
const express = require('express');
const Redis = require('ioredis');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// 配置 MIME 类型，确保浏览器能执行 .tsx 和 .ts 文件
express.static.mime.define({'application/javascript': ['tsx', 'ts']});

// 连接 Redis
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// 静态文件服务
app.use(express.static(__dirname));

// Redis Key 定义
const KEYS = {
  CONFIG: 'm_portal:config',
  CODES_AVAILABLE: 'm_portal:codes:available',
  CLAIMS: 'm_portal:claims',
  TOTAL_COUNT: 'm_portal:total_count'
};

// API 路由保持不变...
app.get('/api/config', async (req, res) => {
  try {
    const config = await redis.get(KEYS.CONFIG);
    res.json(config ? JSON.parse(config) : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    await redis.set(KEYS.CONFIG, JSON.stringify(req.body));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/codes/upload', async (req, res) => {
  const { codes } = req.body;
  if (!Array.isArray(codes) || codes.length === 0) return res.status(400).json({ error: '无效码' });
  try {
    await redis.sadd(KEYS.CODES_AVAILABLE, ...codes);
    const currentSize = await redis.scard(KEYS.CODES_AVAILABLE);
    const claimedSize = await redis.hlen(KEYS.CLAIMS);
    await redis.set(KEYS.TOTAL_COUNT, currentSize + claimedSize);
    res.json({ success: true, count: codes.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/claim', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'ID缺失' });
  try {
    const already = await redis.hget(KEYS.CLAIMS, userId);
    if (already) return res.json({ code: already });
    const code = await redis.spop(KEYS.CODES_AVAILABLE);
    if (!code) return res.status(404).json({ error: '权益已领罄' });
    await redis.hset(KEYS.CLAIMS, userId, code);
    res.json({ code });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stats', async (req, res) => {
  try {
    const available = await redis.scard(KEYS.CODES_AVAILABLE);
    const claimed = await redis.hlen(KEYS.CLAIMS);
    res.json({ total: available + claimed, claimed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/reset', async (req, res) => {
  try {
    await redis.del(KEYS.CONFIG, KEYS.CODES_AVAILABLE, KEYS.CLAIMS, KEYS.TOTAL_COUNT);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 优化兜底路由：如果是请求静态资源（带扩展名），不要返回 index.html
app.get('*', (req, res) => {
  if (req.path.includes('.') && !req.path.endsWith('.html')) {
    res.status(404).send('File Not Found');
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
