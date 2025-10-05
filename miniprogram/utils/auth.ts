// 用户认证工具类
interface UserInfo {
  openid: string;
  nickName: string;
  avatarUrl: string;
  gender: number;
  city: string;
  province: string;
  country: string;
  language: string;
}

interface AuthResult {
  success: boolean;
  userInfo?: UserInfo;
  error?: string;
}

// 初始化云开发
export const initCloud = () => {
  try {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return false;
    }

    console.log('开始初始化云开发...');
    
    // 初始化云开发环境
    wx.cloud.init({
      env: 'koa-8gffchepa2404e26', // 云开发环境ID
      traceUser: true,
    });

    console.log('云开发初始化成功，环境ID: koa-8gffchepa2404e26');
    return true;
  } catch (error) {
    console.error('云开发初始化失败:', error);
    return false;
  }
};

// 获取数据库实例（延迟初始化）
export const getDb = () => {
  if (!wx.cloud) {
    throw new Error('云开发未初始化，请先调用 initCloud()');
  }
  return wx.cloud.database();
};

// 检查用户登录状态
export const checkLoginStatus = (): Promise<boolean> => {
  return new Promise((resolve) => {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userInfo']) {
          // 用户已授权
          resolve(true);
        } else {
          // 用户未授权
          resolve(false);
        }
      },
      fail: () => {
        resolve(false);
      }
    });
  });
};

// 获取用户信息
export const getUserInfo = (): Promise<AuthResult> => {
  return new Promise((resolve) => {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        console.log('获取用户信息成功', res);
        resolve({
          success: true,
          userInfo: res.userInfo
        });
      },
      fail: (err) => {
        console.error('获取用户信息失败', err);
        resolve({
          success: false,
          error: err.errMsg
        });
      }
    });
  });
};

// 云开发登录
export const cloudLogin = (): Promise<AuthResult> => {
  return new Promise((resolve) => {
    wx.cloud.callFunction({
      name: 'login',
      success: (res) => {
        console.log('云开发登录成功', res);
        resolve({
          success: true,
          userInfo: res.result as UserInfo
        });
      },
      fail: (err) => {
        console.error('云开发登录失败', err);
        resolve({
          success: false,
          error: err.errMsg
        });
      }
    });
  });
};

// 保存用户信息到云数据库
export const saveUserInfo = (userInfo: UserInfo): Promise<any> => {
  return new Promise((resolve, reject) => {
    getDb().collection('users').add({
      data: {
        ...userInfo,
        createTime: new Date(),
        updateTime: new Date()
      },
      success: (res) => {
        console.log('用户信息保存成功', res);
        resolve(res);
      },
      fail: (err) => {
        console.error('用户信息保存失败', err);
        reject(err);
      }
    });
  });
};

// 更新用户信息
export const updateUserInfo = (openid: string, userInfo: Partial<UserInfo>): Promise<any> => {
  return new Promise((resolve, reject) => {
    getDb().collection('users').where({
      openid: openid
    }).update({
      data: {
        ...userInfo,
        updateTime: new Date()
      },
      success: (res) => {
        console.log('用户信息更新成功', res);
        resolve(res);
      },
      fail: (err) => {
        console.error('用户信息更新失败', err);
        reject(err);
      }
    });
  });
};

// 获取用户信息从云数据库
export const getUserInfoFromCloud = (openid: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    getDb().collection('users').where({
      openid: openid
    }).get().then((res) => {
      if (res.data.length > 0) {
        resolve(res.data[0]);
      } else {
        resolve(null);
      }
    }).catch((err) => {
      reject(err);
    });
  });
};

// 完整的登录流程
export const login = async (): Promise<AuthResult> => {
  try {
    // 1. 检查登录状态
    const isLoggedIn = await checkLoginStatus();
    if (!isLoggedIn) {
      return {
        success: false,
        error: '用户未授权'
      };
    }

    // 2. 云开发登录获取 openid
    const cloudResult = await cloudLogin();
    if (!cloudResult.success) {
      return cloudResult;
    }

    // 3. 获取用户信息
    const userInfoResult = await getUserInfo();
    if (!userInfoResult.success) {
      return userInfoResult;
    }

    // 4. 合并用户信息
    const userInfo = {
      ...userInfoResult.userInfo,
      openid: cloudResult.userInfo?.openid || ''
    };

    // 5. 保存或更新用户信息到云数据库
    try {
      await saveUserInfo(userInfo);
    } catch (err) {
      // 如果保存失败，尝试更新
      if (userInfo.openid) {
        await updateUserInfo(userInfo.openid, userInfo);
      }
    }

    return {
      success: true,
      userInfo
    };

  } catch (error) {
    console.error('登录流程失败', error);
    return {
      success: false,
      error: error.message || '登录失败'
    };
  }
};

// 退出登录
export const logout = (): Promise<void> => {
  return new Promise((resolve) => {
    // 清除本地存储的用户信息
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('openid');
    
    // 可以在这里添加其他清理逻辑
    console.log('用户已退出登录');
    resolve();
  });
};
