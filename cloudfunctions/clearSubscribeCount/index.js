// 云函数：清空订阅次数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { templateId } = event;
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
    
    // 更新 subscribe 集合中的订阅次数为 0
    const subscribeCollection = db.collection('subscribe');
    
    // 查询是否存在该用户和模板的记录
    const queryResult = await subscribeCollection.where({
      openid: openid,
      templateId: templateId
    }).get();
    
    if (queryResult.data.length > 0) {
      // 记录存在，更新订阅次数为 0
      const docId = queryResult.data[0]._id;
      const updateResult = await subscribeCollection.doc(docId).update({
        data: {
          subscribeCount: 0,
          updateTime: new Date()
        }
      });
      
      console.log('订阅次数已清空:', updateResult);
      
      // 注意：微信小程序后台的订阅次数是由微信服务器管理的，
      // 我们无法通过 API 直接修改微信后台的订阅次数。
      // 但是，我们可以确保数据库中的订阅次数与微信后台保持一致。
      // 如果用户在小程序中清空订阅次数，微信后台的订阅次数会在用户下次订阅时自动更新。
      
      return {
        success: true,
        data: {
          openid: openid,
          templateId: templateId,
          subscribeCount: 0
        },
        message: '订阅次数已清空'
      };
    } else {
      // 记录不存在，创建新记录（订阅次数为 0）
      const newRecord = {
        openid: openid,
        templateId: templateId,
        userId: openid,
        nickname: '用户',
        subscribeCount: 0,
        createTime: new Date(),
        updateTime: new Date()
      };
      
      const addResult = await subscribeCollection.add({
        data: newRecord
      });
      
      console.log('订阅记录已创建（订阅次数为0）:', addResult);
      
      return {
        success: true,
        data: {
          _id: addResult._id,
          ...newRecord
        },
        message: '订阅记录已创建（订阅次数为0）'
      };
    }
  } catch (error) {
    console.error('清空订阅次数失败:', error);
    return {
      success: false,
      error: error.message || '清空订阅次数失败'
    };
  }
};

