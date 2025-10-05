// 云开发连接测试工具

// 测试云开发连接
export const testCloudConnection = async () => {
  try {
    console.log('开始测试云开发连接...');
    
    // 检查云开发是否初始化
    if (!wx.cloud) {
      return {
        success: false,
        error: '云开发未初始化，请检查 wx.cloud.init() 是否已调用'
      };
    }
    
    // 测试云函数调用
    const result = await wx.cloud.callFunction({
      name: 'getWeather',
      data: { cityCode: '310100' }
    });
    
    console.log('云函数调用成功:', result);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('云开发连接测试失败:', error);
    
    // 分析错误类型
    let errorType = '未知错误';
    if (error.errCode === -604100) {
      errorType = '云函数未找到，请检查函数是否已部署';
    } else if (error.errCode === -1) {
      errorType = '云开发环境配置错误';
    } else if (error.errCode === -404001) {
      errorType = '云函数不存在或未部署';
    }
    
    return {
      success: false,
      error: errorType,
      details: error
    };
  }
};

// 获取云开发环境信息
export const getCloudInfo = () => {
  try {
    return {
      hasCloud: !!wx.cloud,
      env: wx.cloud?.env || '未设置',
      version: wx.cloud?.version || '未知'
    };
  } catch (error) {
    return {
      hasCloud: false,
      error: error.message
    };
  }
};
