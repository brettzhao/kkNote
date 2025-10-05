// 获取所有posts数据的云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  console.log('开始获取所有posts数据');
  
  try {
    const posts = db.collection('posts');
    
    // 获取所有posts记录（使用云函数可以获取更多数据）
    let allPostsData = [];
    let skip = 0;
    const limit = 100; // 云函数单次最多100条
    
    while (true) {
      const result = await posts.orderBy('momentTime', 'desc').skip(skip).limit(limit).get();
      
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
    const validPosts = allPostsData.filter(post => !post.deleted);
    
    console.log('过滤后数据数量:', validPosts.length);
    
    return {
      success: true,
      data: validPosts,
      total: validPosts.length
    };
    
  } catch (error) {
    console.error('获取posts数据失败:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};
