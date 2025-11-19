const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const {
  initializeDatabase,
  getOrCreateUser,
  submitVote,
  getVoteStats,
  getStudents
} = require('./database');

const app = express();
const PORT = process.env.PORT || 80;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Session配置
app.use(session({
  name: 'voting.session',
  secret: 'voting-system-secret-key-2023',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: true, // 生产环境设为true
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// 初始化数据库
initializeDatabase();

// 获取或创建用户ID
async function getUserId(req) {
  if (!req.session.userId) {
    const sessionId = uuidv4();
    const user = await getOrCreateUser(sessionId);
    req.session.userId = user.id;
    req.session.hasVoted = user.has_voted;
  }
  return req.session.userId;
}

// API路由

// 获取学生列表
app.get('/api/students', async (req, res) => {
  try {
    const students = await getStudents();
    res.json(students);
  } catch (error) {
    console.error('获取学生列表失败:', error);
    res.status(500).json({ error: '获取学生列表失败' });
  }
});

// 获取用户信息
app.get('/api/user', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const hasVoted = req.session.hasVoted || false;
    res.json({ userId, hasVoted });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 获取投票统计
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getVoteStats();
  
    res.json(stats);
  } catch (error) {
    console.error('获取投票统计失败:', error);
    res.status(500).json({ error: '获取投票统计失败' });
  }
});

// 提交投票
app.post('/api/vote', async (req, res) => {
  try {
    const userId = await getUserId(req);
    
    // 检查是否已经投票
    if (req.session.hasVoted) {
      return res.status(400).json({ error: '您已经投过票了' });
    }

    const votes = req.body;
    
    // 验证投票数据
    const requiredAwards = ['tech', 'innovation', 'ux', 'presentation'];
    const missingAwards = requiredAwards.filter(award => !votes[award]);
    
    if (missingAwards.length > 0) {
      return res.status(400).json({ 
        error: `请完成所有奖项的投票`,
        missingAwards: missingAwards
      });
    }

    // 检查是否有重复选择
    const selectedStudents = Object.values(votes);
    const uniqueStudents = [...new Set(selectedStudents)];
    if (selectedStudents.length !== uniqueStudents.length) {
      return res.status(400).json({ error: '每个奖项必须选择不同的学生' });
    }

    // 提交投票
    await submitVote(userId, votes);
    
    // 更新session状态
    req.session.hasVoted = true;
    
    res.json({ success: true, message: '投票成功' });
  } catch (error) {
    console.error('提交投票失败:', error);
    if (error.message === '您已经投过票了') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: '提交投票失败，请重试' });
    }
  }
});

// 重置用户投票（仅用于测试）
app.post('/api/reset-user', async (req, res) => {
  try {
    req.session.hasVoted = false;
    req.session.userId = null;
    res.json({ success: true, message: '用户状态已重置' });
  } catch (error) {
    console.error('重置用户失败:', error);
    res.status(500).json({ error: '重置用户失败' });
  }
});

// 根路径返回主页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`投票系统服务器运行在 http://localhost:${PORT}`);
  console.log('数据库连接已建立');
});