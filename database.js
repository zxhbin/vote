const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://c2cc0ea3caf43ed91574f581109cbc1e98d1dbf197e1d6bf29be9e49e38e9b7a:sk_hjmVA1Szr17MTYXa08DMF@db.prisma.io:5432/postgres?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});
console.log(process.env.DATABASE_URL)
// 创建表结构
async function initializeDatabase() {
  try {
    // 创建用户表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        has_voted BOOLEAN DEFAULT FALSE
      )
    `);

    // 创建投票表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        award_type VARCHAR(50) NOT NULL,
        student_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, award_type)
      )
    `);

    // 创建学生表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        project VARCHAR(255) NOT NULL
      )
    `);

    // 插入学生数据（如果表为空）
    const studentCount = await pool.query('SELECT COUNT(*) FROM students');
    if (parseInt(studentCount.rows[0].count) === 0) {
      const students = [
        { id: 1, name: "吴坤奕", project: "养老管家App" },
        { id: 2, name: "张奇睿", project: "家庭养生小助手" },
        { id: 3, name: "张瑜", project: "强国先锋App" },
        { id: 4, name: "胡暄晨", project: "家庭智慧管家App" },
        { id: 5, name: "许银萍", project: "红色诗词学习平台" },
        { id: 6, name: "沈鹏宇", project: "智能矿井警报系统" },
        { id: 7, name: "李嘉鑫", project: "党课学习平台" },
        { id: 8, name: "于峻浩", project: "图书馆智能管理系统" },
        { id: 9, name: "修嘉澳", project: "草莓种植园环境监测系统" },
        { id: 10, name: "王相奇", project: "智能停车场管理系统" },
        { id: 11, name: "齐洺宇", project: "校园生活助手" },
        { id: 12, name: "陈静晗", project: "党员志愿服务平台" },
        { id: 13, name: "李方舒", project: "番茄学习助手" },
        { id: 14, name: "石雨桐", project: "智能健康个人助手" },
        { id: 15, name: "王晶", project: "党史知多少·闯关App" },
        { id: 16, name: "蔺茹", project: "党课宝" },
        { id: 17, name: "郭茂杨", project: "红色旅游平台" },
        { id: 18, name: "杨世鹏", project: "爱天气系统" }
      ];

      for (const student of students) {
        await pool.query(
          'INSERT INTO students (id, name, project) VALUES ($1, $2, $3)',
          [student.id, student.name, student.project]
        );
      }
    }

    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
}

// 获取或创建用户
async function getOrCreateUser(sessionId) {
  try {
    // 尝试获取现有用户
    const result = await pool.query(
      'SELECT * FROM users WHERE session_id = $1',
      [sessionId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // 创建新用户
    const newUser = await pool.query(
      'INSERT INTO users (session_id) VALUES ($1) RETURNING *',
      [sessionId]
    );

    return newUser.rows[0];
  } catch (error) {
    console.error('获取或创建用户失败:', error);
    throw error;
  }
}

// 提交投票
async function submitVote(userId, votes) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 检查用户是否已经投票
    const existingVotes = await client.query(
      'SELECT * FROM votes WHERE user_id = $1',
      [userId]
    );

    if (existingVotes.rows.length > 0) {
      throw new Error('您已经投过票了');
    }

    // 插入投票记录
    for (const [awardType, studentId] of Object.entries(votes)) {
      if (studentId !== null && studentId !== undefined) {
        await client.query(
          'INSERT INTO votes (user_id, award_type, student_id) VALUES ($1, $2, $3)',
          [userId, awardType, studentId]
        );
      }
    }

    // 更新用户投票状态
    await client.query(
      'UPDATE users SET has_voted = TRUE WHERE id = $1',
      [userId]
    );

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('提交投票失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 获取投票统计
async function getVoteStats() {
  try {
    // 获取每个奖项的详细投票统计
    const voteDetailsResult = await pool.query(`
      SELECT 
        award_type,
        student_id,
        COUNT(*) as vote_count,
        s.name as student_name,
        s.project as student_project
      FROM votes v
      JOIN students s ON v.student_id = s.id
      GROUP BY award_type, student_id, s.name, s.project
      ORDER BY award_type, vote_count DESC
    `);

    // 获取已完成投票的用户数（更简单的查询）
    const totalVotesResult = await pool.query(`
      SELECT COUNT(*) as total_users
      FROM users 
      WHERE has_voted = TRUE
    `);

    // 格式化结果
    const stats = {
      tech: {},
      innovation: {},
      ux: {},
      presentation: {},
      total: parseInt(totalVotesResult.rows[0].total_users) || 0
    };

    voteDetailsResult.rows.forEach(row => {
      stats[row.award_type][row.student_id] = {
        count: row.vote_count,
        name: row.student_name,
        project: row.student_project
      };
    });

    return stats;
  } catch (error) {
    console.error('获取投票统计失败:', error);
    throw error;
  }
}

// 获取学生列表
async function getStudents() {
  try {
    const result = await pool.query(
      'SELECT id, name, project FROM students ORDER BY id'
    );
    return result.rows;
  } catch (error) {
    console.error('获取学生列表失败:', error);
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  getOrCreateUser,
  submitVote,
  getVoteStats,
  getStudents
};