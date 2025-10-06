// 计算用户统计数据的云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { userId } = event;
  
  console.log('开始计算用户统计数据，userId:', userId);
  
  try {
    const posts = db.collection('posts');
    
    // 获取该用户的所有posts记录（使用云函数可以获取更多数据）
    let allPostsData = [];
    let skip = 0;
    const limit = 100; // 云函数单次最多100条
    
    while (true) {
      const result = await posts.where({
        openid: userId
      }).skip(skip).limit(limit).get();
      
      if (result.data.length === 0) {
        break; // 没有更多数据了
      }
      
      allPostsData = allPostsData.concat(result.data);
      skip += limit;
      
      // 如果返回的数据少于limit，说明已经是最后一批
      if (result.data.length < limit) {
        break;
      }
    }
    
    console.log('查询到的总数据量:', allPostsData.length);
    
    // 过滤掉deleted为true的记录
    const postsData = allPostsData.filter((post) => {
      const isDeleted = post.deleted === true;
      return !isDeleted;
    });
    
    console.log('过滤后数据数量:', postsData.length);
    
    let postsCount = 0;
    let imagesCount = 0;
    let textCount = 0;
    let totalWords = 0;
    const activeDays = new Set(); // 使用Set来记录活跃日期
    
    // 计算统计数据
    postsData.forEach((post, index) => {
      // 发布条数
      postsCount++;
      
      // 图片数量
      if (post.images && Array.isArray(post.images)) {
        imagesCount += post.images.length;
      }
      
      // 文字统计
      if (post.text && typeof post.text === 'string' && post.text.trim()) {
        textCount++; // 有文字内容的动态数量
        const words = post.text.trim().length;
        totalWords += words; // 累加所有文字的字符数
      
      }
      
      // 活跃日期统计
      if (post.momentTime) {
        const date = new Date(post.momentTime);
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD格式
        activeDays.add(dateStr);
      }
    });
    
    // 计算平均字数
    const avgWords = textCount > 0 ? Math.round(totalWords / textCount) : 0;
    
    const stats = {
      postsCount,
      imagesCount,
      textCount,
      totalWords,
      avgWords,
      activeDays: activeDays.size
    };
    
    console.log('计算完成的统计数据:', stats);
    
    return {
      success: true,
      data: stats
    };
    
  } catch (error) {
    console.error('计算用户统计数据失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
