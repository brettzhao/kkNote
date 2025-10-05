// 云函数：获取天气信息
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { cityCode } = event;
  
  try {
    // 使用云函数调用外部API
    const result = await cloud.openapi.httpRequest({
      url: 'https://restapi.amap.com/v3/weather/weatherInfo',
      method: 'GET',
      data: {
        key: '0accdd2ec60d0a5992bb58278b08e1df',
        city: cityCode || '310100', // 默认上海
        extensions: 'base'
      }
    });
    
    console.log('天气API响应:', result);
    
    if (result.data && result.data.status === '1') {
      return {
        success: true,
        data: result.data
      };
    } else {
      return {
        success: false,
        error: result.data ? result.data.info : 'API调用失败'
      };
    }
  } catch (error) {
    console.error('获取天气失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
