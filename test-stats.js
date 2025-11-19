const { getVoteStats } = require('./database');

async function testStats() {
  try {
    console.log('正在获取投票统计...');
    const stats = await getVoteStats();
    
    console.log('投票统计结果:');
    console.log('总投票用户数:', stats.total);
    
    console.log('\n各奖项统计:');
    Object.entries(stats).forEach(([award, votes]) => {
      if (award !== 'total') {
        console.log(`\n${award}:`);
        Object.entries(votes).forEach(([studentId, data]) => {
          console.log(`  学生${studentId}: ${data.count}票`);
        });
      }
    });
    
    console.log('\n统计完成!');
  } catch (error) {
    console.error('测试失败:', error);
  }
  
  process.exit(0);
}

testStats();