// 云函数：获取订阅（创建/更新订阅记录）
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { templateId, userId, nickname } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  try {
    if (!templateId) {
      return {
        success: false,
        error: '模板ID不能为空'
      };
    }
    
    if (!openid) {
      return {
        success: false,
        error: '用户openid不能为空'
      };
    }
    
    // 获取或创建订阅记录
    const subscribeCollection = db.collection('subscribe');
    
    // 查询是否存在该用户和模板的记录
    const queryResult = await subscribeCollection.where({
      openid: openid,
      templateId: templateId
    }).get();
    
    if (queryResult.data.length > 0) {
      // 记录已存在，返回成功
      console.log('订阅记录已存在:', queryResult.data[0]);
      return {
        success: true,
        data: queryResult.data[0],
        message: '订阅记录已存在'
      };
    } else {
      // 记录不存在，创建新记录
      const newRecord = {
        openid: openid,
        templateId: templateId,
        userId: userId || openid,
        nickname: nickname || '用户',
        subscribeCount: 0,
        createTime: new Date(),
        updateTime: new Date()
      };
      
      const addResult = await subscribeCollection.add({
        data: newRecord
      });
      
      console.log('订阅记录创建成功:', addResult);
      
      return {
        success: true,
        data: {
          _id: addResult._id,
          ...newRecord
        },
        message: '订阅记录创建成功'
      };
    }
  } catch (error) {
    console.error('获取订阅失败:', error);
    return {
      success: false,
      error: error.message || '获取订阅失败'
    };
  }
};

