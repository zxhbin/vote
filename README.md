# 多用户在线投票系统

基于 Node.js + Express + PostgreSQL 的多用户实时投票系统。

## 功能特性

- 🗳️ 多用户同时投票
- 📊 实时统计结果
- 🚫 防止重复投票
- 💾 PostgreSQL 数据持久化
- 🔄 自动刷新统计数据
- 📱 响应式设计

## 技术栈

- **后端**: Node.js, Express.js
- **数据库**: PostgreSQL
- **前端**: HTML5, CSS3, JavaScript
- **会话管理**: Express Session
- **实时更新**: 轮询机制

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务器

```bash
npm start
```

或者使用开发模式（需要安装 nodemon）:

```bash
npm run dev
```

### 3. 访问系统

打开浏览器访问: http://localhost:3000

## 数据库配置

系统会自动创建以下表结构：

- `users`: 用户信息表
- `votes`: 投票记录表  
- `students`: 学生信息表

## API 接口

### 获取学生列表
```
GET /api/students
```

### 获取用户信息
```
GET /api/user
```

### 获取投票统计
```
GET /api/stats
```

### 提交投票
```
POST /api/vote
Content-Type: application/json

{
  "tech": 1,
  "innovation": 2,
  "ux": 3,
  "presentation": 4
}
```

### 重置用户状态（测试用）
```
POST /api/reset-user
```

## 投票规则

1. 每个用户只能投票一次
2. 每个奖项必须选择不同的学生
3. 所有奖项都必须完成投票
4. 投票后无法修改

## 项目结构

```
├── package.json          # 项目依赖配置
├── server.js             # Express 服务器
├── database.js           # 数据库操作
├── index.html            # 前端页面
└── README.md             # 说明文档
```

## 安全特性

- Session 会话管理
- 防重复投票验证
- SQL 注入防护
- 数据完整性验证

## 注意事项

- 确保 PostgreSQL 数据库连接正常
- 生产环境需要配置 HTTPS
- 建议定期备份数据库