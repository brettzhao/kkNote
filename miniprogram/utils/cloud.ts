// 云开发工具类
const env = 'koa-8gffchepa2404e26';

// 安全获取数据库实例
const getDb = () => {
  console.log('getDb被调用');
  console.log('wx.cloud是否存在:', !!wx.cloud);
  
  if (!wx.cloud) {
    console.error('云开发未初始化，请先调用 initCloud()');
    throw new Error('云开发未初始化，请先调用 initCloud()');
  }
  
  const db = wx.cloud.database();
  console.log('数据库实例获取成功:', db);
  return db;
};

// 获取用户openid
export const getOpenid = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'login',
      success: (res: any) => {
        console.log('获取openid成功', res);
        if (res.result && res.result.openid) {
          resolve(res.result.openid);
        } else {
          reject(new Error('获取openid失败'));
        }
      },
      fail: (error) => {
        console.error('获取openid失败', error);
        reject(error);
      }
    });
  });
};

// 保存或更新用户信息（以openid为key，存在记录时不更新）
export const saveOrUpdateUserInfo = (userInfo: any): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = getDb();
      const users = db.collection('users');
      
      // 先查询是否已存在该openid的记录
      const existingUser = await getUserInfo(userInfo.openid);
      
      if (existingUser) {
        // 用户已存在，不更新记录，直接返回现有记录
        console.log('用户已存在，不更新数据，直接返回现有记录，openid:', userInfo.openid);
        resolve(existingUser);
      } else {
        // 用户不存在，创建新记录
        console.log('用户不存在，创建新用户记录，openid:', userInfo.openid);
        const createResult = await saveUserInfo(userInfo);
        resolve(createResult);
      }
    } catch (error) {
      console.error('保存或更新用户信息失败', error);
      reject(error);
    }
  });
};

// 保存用户信息到云数据库（内部方法）
const saveUserInfo = (userInfo: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const db = getDb();
      const users = db.collection('users');
      
      console.log('准备创建新用户记录到云数据库:', {
        openid: userInfo.openid,
        avatarUrl: userInfo.avatarUrl,
        nickName: userInfo.nickName
      });
    
      users.add({
        data: {
          ...userInfo,
          createTime: new Date(),
          updateTime: new Date()
        },
        success: (res) => {
          console.log('云数据库新用户记录创建成功:', {
            openid: userInfo.openid,
            avatarUrl: userInfo.avatarUrl,
            recordId: res._id
          });
          resolve(res);
        },
        fail: (error) => {
          console.error('云数据库新用户记录创建失败:', {
            openid: userInfo.openid,
            error: error
          });
          reject(error);
        }
      });
    } catch (error) {
      console.error('创建用户信息时发生异常:', error);
      reject(error);
    }
  });
};

// 更新用户信息（内部方法）
const updateUserInfo = (openid: string, userInfo: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const db = getDb();
      const users = db.collection('users');
      
      // 定义允许更新的字段，明确排除openid等敏感字段
      const allowedUpdateFields = [
        'nickName', 'avatarUrl', 'gender', 'city', 'province', 
        'country', 'language', 'createTime', 'updateTime'
      ];
      
      // 只保留允许更新的字段
      const updateData: any = {};
      allowedUpdateFields.forEach(field => {
        if (userInfo.hasOwnProperty(field) && field !== 'openid') {
          updateData[field] = userInfo[field];
        }
      });
      
      // 确保包含updateTime
      updateData.updateTime = new Date();
      
      console.log('准备更新用户信息到云数据库:', {
        openid: openid,
        allowedFields: allowedUpdateFields,
        updateData: updateData,
        excludedFields: ['openid'] // 明确记录排除的字段
      });
    
      users.where({
        openid: openid
      }).update({
        data: updateData,
        success: (res) => {
          console.log('云数据库用户信息更新成功:', {
            openid: openid,
            updatedFields: Object.keys(updateData),
            updatedCount: res.stats.updated,
            note: 'openid字段已排除，未更新'
          });
          resolve(res);
        },
        fail: (error) => {
          console.error('云数据库用户信息更新失败:', {
            openid: openid,
            error: error
          });
          reject(error);
        }
      });
    } catch (error) {
      console.error('更新用户信息时发生异常:', error);
      reject(error);
    }
  });
};

// 获取用户信息
export const getUserInfo = (openid: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const db = getDb();
      const users = db.collection('users');
    
      // 查询该openid的记录
      users.where({
        openid: openid
      }).get({
        success: (res) => {
          console.log('获取用户信息成功', res);
          if (res.data && res.data.length > 0) {
            const userData = res.data[0];
            console.log('从云数据库获取的时间最旧用户信息:', {
              openid: userData.openid,
              avatarUrl: userData.avatarUrl,
              nickName: userData.nickName,
              createTime: userData.createTime,
              updateTime: userData.updateTime
            });
            resolve(userData);
          } else {
            console.log('云数据库中未找到用户信息:', openid);
            resolve(null);
          }
        },
        fail: (error) => {
          console.error('获取用户信息失败', error);
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

// 根据_id获取用户信息
export const getUserInfoById = (id: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const db = getDb();
      const users = db.collection('users');
    
      users.doc(id).get({
        success: (res) => {
          console.log('根据_id获取用户信息成功', res);
          if (res.data) {
            const userData = res.data;
            console.log('从云数据库获取的用户信息:', {
              _id: userData._id,
              openid: userData.openid,
              avatarUrl: userData.avatarUrl,
              nickName: userData.nickName,
              createTime: userData.createTime,
              updateTime: userData.updateTime
            });
            resolve(userData);
          } else {
            console.log('云数据库中未找到指定_id的用户信息:', id);
            resolve(null);
          }
        },
        fail: (error) => {
          console.error('根据_id获取用户信息失败', error);
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

// 验证用户头像URL是否已更新到云数据库
export const verifyAvatarUrlInCloud = async (openid: string, expectedAvatarUrl: string): Promise<boolean> => {
  try {
    console.log('开始验证云数据库中的头像URL:', { openid, expectedAvatarUrl });
    
    const userInfo = await getUserInfo(openid);
    if (!userInfo) {
      console.error('用户不存在于云数据库中:', openid);
      return false;
    }
    
    const isMatch = userInfo.avatarUrl === expectedAvatarUrl;
    console.log('头像URL验证结果:', {
      openid: openid,
      expected: expectedAvatarUrl,
      actual: userInfo.avatarUrl,
      isMatch: isMatch
    });
    
    return isMatch;
  } catch (error) {
    console.error('验证头像URL时发生错误:', error);
    return false;
  }
};

// 获取动态列表 - 使用云函数获取所有数据
export const getPosts = (): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('开始获取动态列表');
      
      // 检查云开发是否可用
      if (!wx.cloud) {
        console.error('云开发未初始化');
        reject(new Error('云开发未初始化'));
        return;
      }
      
      // 调用云函数获取所有posts数据
      const result = await wx.cloud.callFunction({
        name: 'getAllPosts',
        data: {}
      });
      
      console.log('云函数调用结果:', result);
      
      if (result.result && typeof result.result === 'object' && result.result.success) {
        console.log('获取动态列表成功，数据量:', result.result.data.length);
        resolve(result.result.data);
      } else {
        console.error('云函数返回失败:', result.result);
        const errorMsg = (result.result && typeof result.result === 'object' && result.result.error) 
          ? result.result.error 
          : '获取动态列表失败';
        reject(new Error(errorMsg));
      }
      
    } catch (error) {
      console.error('获取动态列表时发生异常:', error);
      
      // 如果云函数调用失败，回退到本地查询（但只能获取20条数据）
      console.log('云函数调用失败，回退到本地查询（限制20条数据）');
      try {
        const db = getDb();
        const posts = db.collection('posts');
        
        posts.orderBy('momentTime', 'desc').get({
          success: (res) => {
            console.log('本地获取动态列表成功:', res);
            // 过滤掉已删除的动态
            const validPosts = res.data.filter((post: any) => !post.deleted);
            resolve(validPosts);
          },
          fail: (localError) => {
            console.error('本地查询也失败:', localError);
            reject(localError);
          }
        });
      } catch (localError) {
        console.error('本地查询也失败:', localError);
        reject(localError);
      }
    }
  });
};

// 添加动态
export const addPost = (post: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const db = getDb();
      const posts = db.collection('posts');
    
      posts.add({
        data: {
          ...post,
          createTime: new Date(),
          updateTime: new Date()
        },
        success: (res) => {
          console.log('添加动态成功', res);
          resolve(res);
        },
        fail: (error) => {
          console.error('添加动态失败', error);
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

// 删除动态
export const deletePost = (postId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const db = getDb();
      const posts = db.collection('posts');
    
      posts.where({
        id: postId
      }).remove({
        success: (res) => {
          console.log('删除动态成功', res);
          resolve(res);
        },
        fail: (error) => {
          console.error('删除动态失败', error);
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

// 上传文件到云存储
export const uploadFile = (filePath: string, cloudPath: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: (res) => {
        console.log('上传文件成功', res);
        resolve(res);
      },
      fail: (error) => {
        console.error('上传文件失败', error);
        reject(error);
      }
    });
  });
};

// 计算用户统计数据 - 使用云函数扫描所有数据
export const calculateUserStats = (userId: string): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('开始计算用户统计数据，userId:', userId);
      
      // 检查云开发是否可用
      if (!wx.cloud) {
        console.error('云开发未初始化');
        reject(new Error('云开发未初始化'));
        return;
      }
      
      // 调用云函数计算统计数据
      const result = await wx.cloud.callFunction({
        name: 'calculateUserStats',
        data: {
          userId: userId
        }
      });
      
      console.log('云函数调用结果:', result);
      
      if (result.result && typeof result.result === 'object' && result.result.success) {
        console.log('用户统计数据计算完成:', result.result.data);
        resolve(result.result.data);
      } else {
        console.error('云函数返回失败:', result.result);
        const errorMsg = (result.result && typeof result.result === 'object' && result.result.error) 
          ? result.result.error 
          : '统计数据计算失败';
        reject(new Error(errorMsg));
      }
      
    } catch (error) {
      console.error('计算用户统计数据时发生异常:', error);
      
      // 如果云函数调用失败，回退到本地计算（但只能获取20条数据）
      console.log('云函数调用失败，回退到本地计算（限制20条数据）');
      try {
        const db = getDb();
        const posts = db.collection('posts');
        
        posts.where({
          openid: userId
        }).get({
          success: (res) => {
            console.log('本地查询posts记录成功:', res);
            
            const allPostsData = res.data || [];
            
            // 过滤掉deleted为true的记录
            const postsData = allPostsData.filter((post: any) => {
              const isDeleted = post.deleted === true;
              return !isDeleted;
            });
            
            console.log('本地过滤后数据数量:', postsData.length);
            
            let postsCount = 0;
            let imagesCount = 0;
            let textCount = 0;
            let totalWords = 0;
            const activeDays = new Set();
            
            // 计算统计数据
            postsData.forEach((post: any) => {
              postsCount++;
              
              if (post.images && Array.isArray(post.images)) {
                imagesCount += post.images.length;
              }
              
              if (post.text && typeof post.text === 'string') {
                textCount++;
                const words = post.text.trim().length;
                totalWords += words;
              }
              
              if (post.momentTime) {
                const date = new Date(post.momentTime);
                const dateStr = date.toISOString().split('T')[0];
                activeDays.add(dateStr);
              }
            });
            
            const avgWords = textCount > 0 ? Math.round(totalWords / textCount) : 0;
            
            const stats = {
              postsCount,
              imagesCount,
              textCount,
              totalWords,
              avgWords,
              activeDays: activeDays.size
            };
            
            console.log('本地用户统计数据计算完成:', stats);
            resolve(stats);
          },
          fail: (localError) => {
            console.error('本地查询也失败:', localError);
            reject(localError);
          }
        });
      } catch (localError) {
        console.error('本地计算也失败:', localError);
        reject(localError);
      }
    }
  });
};

// 行为记录相关函数

// 记录用户行为
export const recordUserAction = (actionType: string, actionData?: any): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    try {
      const db = getDb();
      const actions = db.collection('actions');
      
      // 获取当前用户的openid和nickname
      const openid = wx.getStorageSync('openid');
      const userInfo = wx.getStorageSync('userInfo') || {};
      const nickname = userInfo.nickName || '未知用户';
      
      if (!openid) {
        console.warn('无法获取openid，跳过行为记录');
        resolve(false);
        return;
      }
      
      const actionRecord = {
        openid: openid,
        nickname: nickname, // 用户昵称
        actionType: actionType, // 行为类型：'view_image', 'publish_post', 'delete_post', 'enter_app', 'view_profile' 等
        actionTime: new Date().toISOString(), // 行为时间
        actionData: actionData || {}, // 行为相关数据
        createdAt: Date.now(),
        userAgent: wx.getSystemInfoSync(), // 设备信息
        page: 'moment' // 当前页面
      };
      
      actions.add({
        data: actionRecord,
        success: (res) => {
          console.log('用户行为记录成功:', actionType, res);
          resolve(true);
        },
        fail: (error) => {
          console.error('用户行为记录失败:', error);
          resolve(false); // 行为记录失败不应该影响主要功能
        }
      });
    } catch (error) {
      console.error('记录用户行为时发生异常:', error);
      resolve(false);
    }
  });
};

// 记录图片查看行为
export const recordImageViewAction = (imageUrl: string, postId: string): Promise<boolean> => {
  return recordUserAction('view_image', {
    imageUrl: imageUrl,
    postId: postId
  });
};

// 记录发布内容行为
export const recordPublishAction = (postData: any): Promise<boolean> => {
  return recordUserAction('publish_post', {
    postId: postData.id,
    hasText: !!postData.text,
    hasImages: postData.images && postData.images.length > 0,
    imageCount: postData.images ? postData.images.length : 0,
    textLength: postData.text ? postData.text.length : 0,
    publishTime: postData.momentTime
  });
};

// 记录删除动态行为
export const recordDeleteAction = (postId: string): Promise<boolean> => {
  return recordUserAction('delete_post', {
    postId: postId
  });
};

// 记录进入应用行为
export const recordEnterAppAction = (): Promise<boolean> => {
  return recordUserAction('enter_app', {
    entryTime: new Date().toISOString()
  });
};

// 记录查看个人资料行为
export const recordViewProfileAction = (): Promise<boolean> => {
  return recordUserAction('view_profile', {
    viewTime: new Date().toISOString()
  });
};

// 记录下拉刷新行为
export const recordRefreshAction = (): Promise<boolean> => {
  return recordUserAction('refresh_feed', {
    refreshTime: new Date().toISOString()
  });
};

// 记录上拉加载更多行为
export const recordLoadMoreAction = (page: number): Promise<boolean> => {
  return recordUserAction('load_more', {
    page: page,
    loadTime: new Date().toISOString()
  });
};
