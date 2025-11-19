const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://c2cc0ea3caf43ed91574f581109cbc1e98d1dbf197e1d6bf29be9e49e38e9b7a:sk_hjmVA1Szr17MTYXa08DMF@db.prisma.io:5432/postgres?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function debugDatabase() {
  try {
    console.log('=== 调试数据库状态 ===\n');
    
    // 检查用户表
    const usersResult = await pool.query('SELECT id, session_id, has_voted FROM users ORDER BY created_at');
    console.log('用户表数据:');
    console.log(usersResult.rows);
    console.log(`总用户数: ${usersResult.rows.length}`);
    console.log(`已投票用户数: ${usersResult.rows.filter(u => u.has_voted).length}\n`);
    
    // 检查投票表
    const votesResult = await pool.query(`
      SELECT v.user_id, v.award_type, v.student_id, s.name as student_name, u.has_voted
      FROM votes v 
      JOIN students s ON v.student_id = s.id 
      JOIN users u ON v.user_id = u.id
      ORDER BY v.user_id, v.award_type
    `);
    console.log('投票表数据:');
    console.log(votesResult.rows);
    console.log(`总投票记录数: ${votesResult.rows.length}\n`);
    
    // 按用户分组统计
    const userVotes = {};
    votesResult.rows.forEach(row => {
      if (!userVotes[row.user_id]) {
        userVotes[row.user_id] = { votes: 0, has_voted: row.has_voted };
      }
      userVotes[row.user_id].votes++;
    });
    
    console.log('用户投票统计:');
    Object.entries(userVotes).forEach(([userId, data]) => {
      console.log(`用户${userId}: ${data.votes}条投票记录, has_voted=${data.has_voted}`);
    });
    
    // 检查统计查询
    const statsResult = await pool.query('SELECT COUNT(*) as total FROM users WHERE has_voted = TRUE');
    console.log(`\n统计查询结果: ${statsResult.rows[0].total} 个已投票用户`);
    
  } catch (error) {
    console.error('调试失败:', error);
  } finally {
    await pool.end();
  }
}

debugDatabase();