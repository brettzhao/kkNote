// profile页面逻辑
import { initCloud } from '../../utils/auth';
import { getOpenid, saveOrUpdateUserInfo, getUserInfo, getUserInfoById, calculateUserStats, getPostStatCache, updatePostStatCache, getOrCreateSubscribeRecord, updateSubscribeCount, recordPushMessage, getSubscribeRecord, getSubDetail } from '../../utils/cloud';

interface UserInfo {
  openid: string;
  nickName: string;
  avatarUrl: string;
  gender: number;
  city: string;
  province: string;
  country: string;
  language: string;
  createTime?: Date;
  updateTime?: Date;
}

interface Stats {
  postsCount: number;
  imagesCount: number;
  textCount: number;
  totalWords: number;
  avgWords: number;
  activeDays: number;
}

Page({
  data: {
    userInfo: {} as UserInfo,
    isLoggedIn: false,
    isLoading: true, // 添加loading状态
    defaultAvatar: 'cloud://koa-8gffchepa2404e26.6b6f-koa-8gffchepa2404e26-1302616754/images/avatars/wilump.jpg',
    currentTime: '',
    stats: {
      postsCount: 0,
      imagesCount: 0,
      textCount: 0,
      totalWords: 0,
      avgWords: 0,
      activeDays: 0
    } as Stats,
    // 推送相关
    pushIntervalId: 0 as any,
    isPushing: false,
    subscribeCount: 0, // 订阅次数
    showClearSubscribePopup: false, // 清空订阅次数弹窗显示状态
    lastSubscribeClickTime: 0 // 上次订阅点击时间，用于防抖
  },

  onLoad() {
    console.log('Profile页面加载');
    
    // 设置当前时间
    this.setData({
      currentTime: new Date().toLocaleString()
    });
    
    // 初始化云开发
    try {
      initCloud();
    } catch (error) {
      console.error('初始化云开发失败:', error);
    }
    
    // 加载订阅次数（异步，不阻塞页面显示）
    this.loadSubscribeCount().catch(error => {
      console.error('加载订阅次数失败:', error);
    });
    
    // 自动获取openid并加载用户数据（异步，不阻塞页面显示）
    this.autoLoadUserData().catch(error => {
      console.error('自动加载用户数据失败:', error);
    });
    
    // 加载统计数据（异步，不阻塞页面显示）
    this.loadStats().catch(error => {
      console.error('加载统计数据失败:', error);
    });
  },

  onShow() {
    // 页面显示时实时刷新统计数据
    console.log('Profile页面显示，开始实时更新统计数据...');
    this.loadStats().catch(error => {
      console.error('加载统计数据失败:', error);
    });
    // 刷新订阅次数
    this.loadSubscribeCount().catch(error => {
      console.error('加载订阅次数失败:', error);
    });
  },
  onHide() {
    // 页面隐藏时停止推送
    this.clearPushInterval();
  },
  onUnload() {
    // 页面卸载时停止推送
    this.clearPushInterval();
  },

  // 自动加载用户数据（每次登录新建记录）
  async autoLoadUserData() {
    try {
      console.log('开始自动加载用户数据...');
      
      // 显示loading状态
      this.setData({ isLoading: true });
      
      // 先检查本地存储中是否有openid
      let openid = wx.getStorageSync('openid');
      
      if (!openid) {
        console.log('本地未找到openid，尝试获取...');
        try {
          // 自动获取openid
          openid = await getOpenid();
          console.log('自动获取openid成功:', openid);
          
          // 保存到本地存储
          wx.setStorageSync('openid', openid);
        } catch (error) {
          console.error('获取openid失败:', error);
          this.setData({ 
            isLoggedIn: false,
            userInfo: {} as UserInfo,
            isLoading: false // 确保隐藏loading状态
          });
          return;
        }
      }
      
      console.log('当前用户是指定用户，使用正常流程，openid:', openid);
      
      // 指定用户，使用正常流程
      const newUserInfo = {
        openid: openid,
        nickName: '威朗普',
        avatarUrl: 'cloud://koa-8gffchepa2404e26.6b6f-koa-8gffchepa2404e26-1302616754/images/avatars/wilump.jpg',
        gender: 0,
        city: '',
        province: '',
        country: '',
        language: 'zh_CN',
        createTime: new Date(),
        updateTime: new Date()
      };
      
      // 保存或获取用户记录
      try {
        const userInfo = await saveOrUpdateUserInfo(newUserInfo);
        console.log('获取用户记录成功:', userInfo);
        
        this.setData({
          isLoggedIn: true,
          userInfo: userInfo,
          isLoading: false // 隐藏loading状态
        });
        
        // 更新本地存储
        wx.setStorageSync('userInfo', userInfo);
      } catch (saveError) {
        console.warn('保存或获取用户记录失败:', saveError);
        
        // 如果保存失败，使用新创建的记录
        this.setData({
          isLoggedIn: true,
          userInfo: newUserInfo,
          isLoading: false // 隐藏loading状态
        });
        
        // 更新本地存储
        wx.setStorageSync('userInfo', newUserInfo);
      }
      
    } catch (error) {
      console.error('自动加载用户数据失败:', error);
      // 出错时使用本地存储作为备选
      const userInfo = wx.getStorageSync('userInfo') || {};
      const isLoggedIn = !!(userInfo.openid);
      this.setData({ 
        isLoggedIn, 
        userInfo,
        isLoading: false // 确保隐藏loading状态
      });
    }
  },


  // 加载用户信息（从云数据库）
  async loadUserInfo() {
    try {
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        console.log('未找到openid，无法加载用户信息');
        return;
      }
      
      let userInfo;
      
      console.log('当前用户是指定用户，查询正常记录，openid:', openid);
      // 指定用户，查询正常记录
      userInfo = await getUserInfo(openid);
      
      if (userInfo) {
        console.log('从云数据库加载用户信息成功:', userInfo);
        this.setData({ userInfo });
        
        // 更新本地存储
        wx.setStorageSync('userInfo', userInfo);
      } else {
        console.log('云数据库中未找到用户信息');
        // 如果云数据库中没有，使用本地存储
        const localUserInfo = wx.getStorageSync('userInfo') || {};
        this.setData({ userInfo: localUserInfo });
      }
      
    } catch (error) {
      console.error('加载用户信息失败:', error);
      // 出错时使用本地存储
      const userInfo = wx.getStorageSync('userInfo') || {};
      this.setData({ userInfo });
    }
  },

  // 加载统计数据
  async loadStats() {
    try {
      console.log('开始加载用户统计数据...');
      
      // 获取当前用户的openid
      const openid = wx.getStorageSync('openid');
      console.log('当前openid:', openid);
      
      if (!openid) {
        console.log('未找到openid，无法加载统计数据');
        // 设置默认统计数据
        const defaultStats = {
          postsCount: 0,
          imagesCount: 0,
          textCount: 0,
          totalWords: 0,
          avgWords: 0,
          activeDays: 0
        };
        this.setData({ stats: defaultStats });
        return;
      }
      
      // 优先读取 postStat 缓存
      try {
        const cache = await getPostStatCache(openid);
        if (cache) {
          console.log('从 postStat 缓存读取统计数据:', cache);
          // 使用缓存数据，但需要确保字段完整
          const stats = {
            postsCount: cache.postsCount || 0,
            imagesCount: cache.imagesCount || 0,
            textCount: cache.textCount || 0,
            totalWords: cache.totalWords || 0,
            avgWords: cache.avgWords || 0,
            activeDays: cache.activeDays || 0
          };
          this.setData({ stats });
          console.log('统计数据已从缓存设置到页面数据中');
          return;
        }
      } catch (cacheError) {
        console.warn('读取 postStat 缓存失败，将使用真实数据:', cacheError);
        // 缓存读取失败，继续使用真实数据
      }
      
      // 缓存不存在或读取失败，使用真实数据
      console.log('postStat 缓存不存在，使用真实数据查询统计数据:', openid);
      
      // 计算用户统计数据
      const stats = await calculateUserStats(openid);
      console.log('用户统计数据加载成功:', stats);
      
      // 更新 postStat 缓存（如果缓存不存在，查询后更新缓存）
      try {
        await updatePostStatCache(openid, stats);
        console.log('postStat 缓存已更新');
      } catch (cacheError) {
        console.warn('更新 postStat 缓存失败:', cacheError);
        // 缓存更新失败不影响数据显示
      }
      
      this.setData({
        stats: stats
      });
      
      console.log('统计数据已设置到页面数据中');
      
    } catch (error) {
      console.error('加载统计数据失败:', error);
      
      // 出错时使用默认统计数据
      const defaultStats = {
        postsCount: 0,
        imagesCount: 0,
        textCount: 0,
        totalWords: 0,
        avgWords: 0,
        activeDays: 0
      };
      
      console.log('使用默认统计数据:', defaultStats);
      this.setData({
        stats: defaultStats
      });
    }
  },

  // 用户卡片点击
  onUserCardTap() {
    // 用户卡片点击处理
    console.log('用户卡片被点击，当前用户信息:', this.data.userInfo);
  },

  // 关于点击
  onAboutClick() {
    wx.showModal({
      title: '关于 kkNote',
      content: '一个基于 TDesign 的微信小程序动态分享应用',
      showCancel: false
    });
  },

  // 订阅次数长按事件
  onSubscribeCountLongPress() {
    console.log('长按订阅次数显示');
    this.setData({
      showClearSubscribePopup: true
    });
  },

  // 清空订阅次数弹窗显示状态变化
  onClearSubscribePopupVisibleChange(e: any) {
    this.setData({
      showClearSubscribePopup: e.detail.visible
    });
  },

  // 确认清空订阅次数
  async confirmClearSubscribe() {
    // 清空本地订阅次数
    this.setData({ subscribeCount: 0 });
    wx.setStorageSync('subscribeCount', 0);
    
    // 调用云函数清空订阅次数（同时更新 subscribe 集合）
    try {
      const templateId = 'Jg6qHMqCG24_bGVVPwtHjeBxQYB0urT0REeah9g7zfc';
      
      if (!wx.cloud) {
        throw new Error('云开发未初始化');
      }
      
      // 调用云函数清空订阅次数
      const result = await wx.cloud.callFunction({
        name: 'clearSubscribeCount',
        data: {
          templateId: templateId
        }
      });
      
      console.log('清空订阅次数云函数调用结果:', result);
      
      if (result.result && typeof result.result === 'object' && result.result.success) {
        console.log('subscribe 集合已清空，小程序后台订阅次数已同步');
      } else {
        console.warn('清空订阅次数云函数返回失败:', result.result);
        // 如果云函数失败，仍然尝试本地更新 subscribe 集合
        const openid = wx.getStorageSync('openid');
        if (openid) {
          try {
            await updateSubscribeCount(openid, templateId, 0, {
              nickName: this.data.userInfo?.nickName
            });
            console.log('subscribe 集合已通过本地方法更新');
          } catch (error) {
            console.error('本地更新 subscribe 集合失败:', error);
          }
        }
      }
    } catch (error) {
      console.error('调用清空订阅次数云函数失败:', error);
      // 如果云函数调用失败，仍然尝试本地更新 subscribe 集合
      try {
        const openid = wx.getStorageSync('openid');
        const templateId = 'Jg6qHMqCG24_bGVVPwtHjeBxQYB0urT0REeah9g7zfc';
        if (openid) {
          await updateSubscribeCount(openid, templateId, 0, {
            nickName: this.data.userInfo?.nickName
          });
          console.log('subscribe 集合已通过本地方法更新（云函数失败后的降级处理）');
        }
      } catch (localError) {
        console.error('本地更新 subscribe 集合失败:', localError);
      }
    }
    
    // 停止推送
    this.clearPushInterval();
    
    // 关闭弹窗
    this.setData({ showClearSubscribePopup: false });
    
    wx.showToast({
      title: '已清空订阅次数',
      icon: 'success'
    });
    
    console.log('订阅次数已清空');
  },

  // 取消清空订阅次数
  cancelClearSubscribe() {
    this.setData({ showClearSubscribePopup: false });
  },

  // 加载订阅次数
  async loadSubscribeCount() {
    try {
      const openid = wx.getStorageSync('openid');
      const templateId = 'Jg6qHMqCG24_bGVVPwtHjeBxQYB0urT0REeah9g7zfc';
      
      // 优先从 subscribe 集合读取
      if (openid) {
        try {
          const subscribeRecord = await getSubscribeRecord(openid, templateId);
          if (subscribeRecord && subscribeRecord.subscribeCount !== undefined) {
            const count = subscribeRecord.subscribeCount || 0;
            this.setData({ subscribeCount: count });
            wx.setStorageSync('subscribeCount', count);
            console.log('从 subscribe 集合加载订阅次数:', count);
            return;
          }
        } catch (error) {
          console.warn('从 subscribe 集合加载订阅次数失败，使用本地存储:', error);
        }
      }
      
      // 如果 subscribe 集合中没有，使用本地存储
      const count = wx.getStorageSync('subscribeCount') || 0;
      this.setData({ subscribeCount: count });
      console.log('从本地存储加载订阅次数:', count);
    } catch (error) {
      console.error('加载订阅次数失败:', error);
      this.setData({ subscribeCount: 0 });
    }
  },

  // 增加订阅次数
  async addSubscribeCount(amount: number = 1) {
    const currentCount = this.data.subscribeCount || 0;
    const newCount = currentCount + amount;
    this.setData({ subscribeCount: newCount });
    wx.setStorageSync('subscribeCount', newCount);
    console.log('订阅次数增加', amount, '次，当前总数:', newCount);
    
    // 同步更新 subscribe 集合
    try {
      const openid = wx.getStorageSync('openid');
      const templateId = 'Jg6qHMqCG24_bGVVPwtHjeBxQYB0urT0REeah9g7zfc';
      if (openid) {
        await updateSubscribeCount(openid, templateId, newCount, {
          nickName: this.data.userInfo?.nickName
        });
        console.log('subscribe 集合已更新');
      }
    } catch (error) {
      console.error('更新 subscribe 集合失败:', error);
      // 更新失败不影响主流程
    }
  },

  // 减少订阅次数
  async decreaseSubscribeCount(amount: number = 1) {
    const currentCount = this.data.subscribeCount || 0;
    const newCount = Math.max(0, currentCount - amount);
    this.setData({ subscribeCount: newCount });
    wx.setStorageSync('subscribeCount', newCount);
    console.log('订阅次数减少', amount, '次，当前剩余:', newCount);
    
    // 同步更新 subscribe 集合
    try {
      const openid = wx.getStorageSync('openid');
      const templateId = 'Jg6qHMqCG24_bGVVPwtHjeBxQYB0urT0REeah9g7zfc';
      if (openid) {
        await updateSubscribeCount(openid, templateId, newCount, {
          nickName: this.data.userInfo?.nickName
        });
        console.log('subscribe 集合已更新');
      }
    } catch (error) {
      console.error('更新 subscribe 集合失败:', error);
      // 更新失败不影响主流程
    }
    
    return newCount;
  },

  // 订阅并开始推送
  async onSubscribeAndStartPush() {
    // 防抖：检查是否点击太快（1秒内）
    const now = Date.now();
    const lastClickTime = this.data.lastSubscribeClickTime || 0;
    const timeSinceLastClick = now - lastClickTime;
    
    if (timeSinceLastClick < 1000 && lastClickTime > 0) {
      // 点击太快，直接返回，不显示提示
      return;
    }
    
    // 更新上次点击时间
    this.setData({ lastSubscribeClickTime: now });
    
    const templateId = 'Jg6qHMqCG24_bGVVPwtHjeBxQYB0urT0REeah9g7zfc';
    try {
      const result = await wx.requestSubscribeMessage({
        tmplIds: [templateId]
      });
      
      console.log('订阅消息授权结果:', result);
      
      // 检查用户是否同意订阅
      if (result[templateId] === 'accept') {
        // 订阅成功，增加订阅次数（每次订阅增加1次）
        // 获取或创建 subscribe 记录
        const openid = wx.getStorageSync('openid');
        if (openid) {
          try {
            await getOrCreateSubscribeRecord(openid, templateId, {
              nickName: this.data.userInfo?.nickName,
              avatarUrl: this.data.userInfo?.avatarUrl
            });
          } catch (error) {
            console.error('创建 subscribe 记录失败:', error);
          }
        }
        
        // 增加订阅次数（会自动更新 subscribe 集合）
        await this.addSubscribeCount(1);
        // 订阅成功不显示弹浮层
        return result;
      } else if (result[templateId] === 'reject') {
        wx.showToast({ title: '已拒绝订阅', icon: 'none' });
        return result;
      } else {
        wx.showToast({ title: '订阅失败: ' + result[templateId], icon: 'none' });
        return result;
      }
    } catch (err: any) {
      console.error('订阅消息授权失败:', err);
      // 检查是否是点击太快导致的错误，如果是则不显示提示
      if (err.errMsg && (err.errMsg.includes('频繁') || err.errMsg.includes('too fast') || err.errMsg.includes('rate limit'))) {
        // 点击太快导致的错误，不显示提示
        return null;
      } else {
        wx.showToast({ title: '授权失败: ' + (err.errMsg || '未知错误'), icon: 'none' });
      }
      return null;
    }
  },

  // 开始每5秒推送
  startPushInterval() {
    if (this.data.isPushing) {
      wx.showToast({ title: '已在推送中', icon: 'none' });
      return;
    }
    const intervalId = setInterval(() => {
      this.sendDetailPushOnce();
    }, 5000) as any;
    this.setData({ pushIntervalId: intervalId, isPushing: true });
  },

  // 停止推送
  onStopPush() {
    this.clearPushInterval();
    wx.showToast({ title: '已停止', icon: 'none' });
  },

  clearPushInterval() {
    if (this.data.pushIntervalId) {
      clearInterval(this.data.pushIntervalId as any);
    }
    if (this.data.isPushing) {
      this.setData({ pushIntervalId: 0 as any, isPushing: false });
    }
  },

  // 发送一次详细内容推送
  async sendDetailPushOnce() {
    try {
      // 检查订阅次数
      if (this.data.subscribeCount <= 0) {
        console.warn('订阅次数不足，无法发送推送');
        wx.showToast({ 
          title: '订阅次数已用完，请重新订阅', 
          icon: 'none',
          duration: 2000
        });
        this.clearPushInterval();
        return;
      }

      if (!wx.cloud) {
        console.warn('云开发未初始化，无法发送推送');
        wx.showToast({ title: '云开发未初始化', icon: 'none' });
        return;
      }
      
      const openid = wx.getStorageSync('openid');
      const templateId = 'Jg6qHMqCG24_bGVVPwtHjeBxQYB0urT0REeah9g7zfc';
      const userName = this.data.userInfo?.nickName || '系统';
      const now = this.formatDateTime(new Date());
      
      // 从 subDetail 集合获取对应 template 的数据
      let thing1Value = '药品';  // 默认值
      let thing16Value = userName;  // 默认值
      
      try {
        const subDetail = await getSubDetail(templateId);
        if (subDetail) {
          thing1Value = subDetail.thing1 || thing1Value;
          thing16Value = subDetail.thing16 || thing16Value;
          console.log(`[推送] 从 subDetail 集合获取数据: thing1=${thing1Value}, thing16=${thing16Value}`);
        } else {
          console.warn(`[推送] subDetail 集合中未找到 templateId 为 ${templateId} 的记录，使用默认值`);
        }
      } catch (error) {
        console.error('[推送] 从 subDetail 集合获取数据失败:', error);
        // 使用默认值继续推送
      }
      
      const pushData = {
        thing1: { value: thing1Value },  // 从 subDetail 集合获取
        time2: { value: now },
        thing16: { value: thing16Value }  // 从 subDetail 集合获取
      };
      
      console.log(`[推送] 开始发送推送，当前订阅次数: ${this.data.subscribeCount}, 时间: ${now}`);
      
      const result = await wx.cloud.callFunction({
        name: 'sendSubscribeMessage',
        data: {
          templateId: templateId,
          data: pushData,
          userId: openid,
          nickname: userName
        }
      });
      console.log('[推送] 推送结果:', JSON.stringify(result, null, 2));
      
      // 记录推送信息到 pushRecord 集合
      try {
        const pushSuccess = result.result && typeof result.result === 'object' && result.result.success;
        await recordPushMessage({
          openid: openid,
          templateId: templateId,
          userId: openid,
          nickname: userName,
          pushData: pushData,
          success: pushSuccess,
          errCode: result.result && typeof result.result === 'object' ? result.result.errCode : undefined,
          errMsg: result.result && typeof result.result === 'object' ? result.result.error : undefined
        });
        console.log('[推送] 推送记录已保存到 pushRecord');
      } catch (recordError) {
        console.error('[推送] 记录推送信息失败:', recordError);
        // 记录失败不影响推送流程
      }
      
      // 检查推送结果
      if (result.result && typeof result.result === 'object') {
        if (result.result.success) {
          console.log('[推送] 推送成功');
          // 推送成功，减少订阅次数
          const remainingCount = await this.decreaseSubscribeCount(1);
          console.log(`[推送] 推送成功，剩余订阅次数: ${remainingCount}`);
          
          // 如果次数用完，停止推送
          if (remainingCount <= 0) {
            console.warn('[推送] 订阅次数已用完，停止推送');
            wx.showToast({ 
              title: '订阅次数已用完，请重新订阅', 
              icon: 'none',
              duration: 2000
            });
            this.clearPushInterval();
          }
        } else {
          const errorMsg = result.result.error || '推送失败';
          const errCode = result.result.errCode;
          console.error(`[推送] 推送失败: ${errorMsg}, 错误码: ${errCode}`);
          
          // 微信订阅消息错误码说明：
          // 43101: 用户拒绝接受消息
          // 47003: 模板参数不正确
          // 40001: 无效的access_token
          // 40003: 无效的openid
          // 40037: 无效的模板id
          // 43101: 用户拒绝接受消息（可能是订阅次数用完）
          // 47003: 模板参数不正确
          
          // 检查是否是订阅次数用完的错误
          // 注意：一次性订阅消息，每次订阅只能发送一次
          // 如果错误码是 43101，可能是订阅次数用完
          if (errCode === 43101) {
            // 用户拒绝或订阅次数用完
            console.warn('[推送] 订阅次数可能已用完（错误码43101），减少次数并停止推送');
            await this.decreaseSubscribeCount(1);
            wx.showToast({ 
              title: '订阅次数已用完，请重新订阅', 
              icon: 'none',
              duration: 3000
            });
            this.clearPushInterval();
          } else if (errCode === 47003) {
            // 模板参数错误，不减少次数，继续尝试
            console.warn('[推送] 模板参数错误，保留次数，继续推送');
          } else {
            // 其他错误（如网络问题），不减少次数，继续尝试
            console.warn(`[推送] 推送失败但保留次数，错误码: ${errCode}, 错误信息: ${errorMsg}`);
          }
        }
      } else {
        console.error('[推送] 推送结果格式错误:', result);
      }
    } catch (error: any) {
      console.error('[推送] 推送异常:', error);
      // 网络异常等不减少次数，继续尝试
    }
  },

  formatDateTime(date: Date) {
    const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }
});