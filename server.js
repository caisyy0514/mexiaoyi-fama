
const express = require('express');
const Redis = require('ioredis');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// 连接 Redis
// Zeabur 会自动注入 REDIS_URL 或类似环境变量
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// Redis Key 定义
const KEYS = {
  CONFIG: 'm_portal:config',
  CODES_AVAILABLE: 'm_portal:codes:available',
  CLAIMS: 'm_portal:claims', // Hash: userId -> code
  TOTAL_COUNT: 'm_portal:total_count'
};

// 1. 获取配置
app.get('/api/config', async (req, res) => {
  try {
    const config = await redis.get(KEYS.CONFIG);
    res.json(config ? JSON.parse(config) : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. 保存配置
app.post('/api/config', async (req, res) => {
  try {
    await redis.set(KEYS.CONFIG, JSON.stringify(req.body));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. 批量上传会员码
app.post('/api/codes/upload', async (req, res) => {
  const { codes } = req.body;
  if (!Array.isArray(codes) || codes.length === 0) {
    return res.status(400).json({ error: '无效的会员码列表' });
  }

  try {
    // 使用集合(Set)存储可用码，自动去重
    await redis.sadd(KEYS.CODES_AVAILABLE, ...codes);
    // 更新总数计数器
    const currentSize = await redis.scard(KEYS.CODES_AVAILABLE);
    const claimedSize = await redis.hlen(KEYS.CLAIMS);
    await redis.set(KEYS.TOTAL_COUNT, currentSize + claimedSize);
    
    res.json({ success: true, count: codes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. 领取会员码 (核心逻辑：原子性操作)
app.post('/api/claim', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: '用户标识缺失' });

  try {
    // 检查是否已领过
    const alreadyClaimed = await redis.hget(KEYS.CLAIMS, userId);
    if (alreadyClaimed) {
      return res.json({ code: alreadyClaimed });
    }

    // 从集合中随机弹出一个码 (SPOP 保证原子性，防止并发超领)
    const code = await redis.spop(KEYS.CODES_AVAILABLE);
    if (!code) {
      return res.status(404).json({ error: '权益已领罄，请联系管理员补充' });
    }

    // 记录领取记录
    await redis.hset(KEYS.CLAIMS, userId, code);
    res.json({ code });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. 获取统计数据
app.get('/api/stats', async (req, res) => {
  try {
    const available = await redis.scard(KEYS.CODES_AVAILABLE);
    const claimed = await redis.hlen(KEYS.CLAIMS);
    res.json({ 
      total: available + claimed, 
      claimed: claimed 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. 重置系统
app.post('/api/reset', async (req, res) => {
  try {
    await redis.del(KEYS.CONFIG, KEYS.CODES_AVAILABLE, KEYS.CLAIMS, KEYS.TOTAL_COUNT);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 兜底路由指向前端入口
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
