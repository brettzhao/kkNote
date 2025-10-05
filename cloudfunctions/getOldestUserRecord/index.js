// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'koa-8gffchepa2404e26' // 使用你的云开发环境ID
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('getOldestUserRecord 云函数被调用，参数:', event)
  
  try {
    const { openid } = event
    
    if (!openid) {
      console.error('缺少openid参数')
      return {
        success: false,
        error: '缺少openid参数'
      }
    }
    
    console.log('开始查询openid为', openid, '的时间最旧用户记录')
    
    // 查询该openid的所有用户记录，按createTime升序排列，取第一条（最旧的）
    const result = await db.collection('users')
      .where({
        openid: openid
      })
      .orderBy('createTime', 'asc')
      .limit(1)
      .get()
    
    console.log('查询结果:', result)
    
    if (result.data && result.data.length > 0) {
      const oldestRecord = result.data[0]
      console.log('找到时间最旧的用户记录:', oldestRecord)
      
      return {
        success: true,
        data: oldestRecord,
        message: '成功获取时间最旧的用户记录'
      }
    } else {
      console.log('未找到任何用户记录')
      return {
        success: false,
        data: null,
        message: '未找到任何用户记录'
      }
    }
    
  } catch (error) {
    console.error('查询时间最旧用户记录时发生错误:', error)
    return {
      success: false,
      error: error.message || '查询失败',
      message: '查询时间最旧用户记录失败'
    }
  }
}
