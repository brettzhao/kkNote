// moment页面逻辑
import { initCloud } from '../../utils/auth';
import { getPosts, addPost, deletePost, uploadFile, recordImageViewAction, recordPublishAction, recordDeleteAction, recordEnterAppAction, recordRefreshAction, recordLoadMoreAction, getComments, addComment, deleteComment, incrementPostStatCache, decrementPostStatCache } from '../../utils/cloud';
import { testCloudConnection, getCloudInfo } from '../../utils/cloud-test';
import { getTodayLunarDate } from '../../utils/lunar';

interface Post {
  
  _id?: string;
  id: string;
  openid: string;
  text: string;
  images: string[];
  avatar: string;
  time: string;
  momentTime: string;
  createdAt: number;
  deleted?: boolean;
  comments?: Comment[];
  showAllComments?: boolean;
}

interface Comment {
  _id?: string;
  id: string;
  postId: string;
  openid: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  time: string;
  createdAt: number;
  deleted?: boolean;
}

Page({
  data: {
    posts: [] as Post[],
    showPublish: false,
    showFab: false, // 控制发布按钮显示，默认为false，需要检查openid后决定
    publishText: '',
    publishImages: [] as string[],
    publishTime: new Date().toISOString(),
    formattedPublishTime: '',
    publishing: false,
    timePickerRange: [[], [], [], [], []], // 年、月、日、时、分的选项
    timePickerValue: [0, 0, 0, 0, 0], // 当前选中的索引
    showDeleteOptions: false,
    // 分页相关
    pageSize: 10, // 每页加载10条数据
    currentPage: 0, // 当前页码
    hasMore: true, // 是否还有更多数据
    loading: false, // 是否正在加载
    refreshing: false, // 是否正在刷新
    // 图片预览相关
    showImagePreview: false, // 是否显示图片预览
    previewImageUrl: '', // 预览图片URL
    imageScale: 1, // 图片缩放比例
    imageTranslateX: 0, // 图片X轴偏移
    imageTranslateY: 0, // 图片Y轴偏移
    startDistance: 0, // 双指开始距离
    startScale: 1, // 开始缩放比例
    lastTouchX: 0, // 上次触摸X坐标
    lastTouchY: 0, // 上次触摸Y坐标
    currentDate: {
      year: '',
      month: '',
      day: ''
    },
    weatherInfo: {
      temp: '--',
      desc: '获取中...',
      icon: '🌤️',
      city: '',
      winddirection: '',
      windpower: '',
      humidity: '',
      loading: true,
      error: false,
      location: '', // 添加位置坐标显示
      coordinates: '' // 添加坐标信息
    },
    countdownDays: 0,
    lunarDate: '',
    // 键盘状态相关
    keyboardHeight: 0,
    isKeyboardShow: false,
    // 所有posts数据缓存
    allPostsData: [] as Post[],
    // 允许发布权限的openid列表
    allowedOpenids: ['okU9A1yvJI1WS_NfmEo0wMY9Lyl8', 'okU9A16kG2gnWCSxDTWmZFGyGR7k'],
    // 评论相关
    showCommentPopup: false,
    selectedPostId: '',
    currentPostComments: [] as Comment[],
    commentText: '',
    commentSubmitting: false,
    showCommentDeleteOptions: false,
    selectedCommentId: '',
    // 允许评论权限的openid列表
    allowedCommentOpenids: ['okU9A1yvJI1WS_NfmEo0wMY9Lyl8', 'okU9A16kG2gnWCSxDTWmZFGyGR7k']
  },

  onLoad() {
    console.log('moment页面加载');
    
    // 初始化云开发
    initCloud();
    
    // 检查云开发状态
    this.checkCloudStatus();
    
    // 检查用户发布权限
    this.checkPublishPermission();
    
    this.initDate();
    this.initCountdown();
    this.initPublishTime();
    this.loadPosts();
    this.initWeather();
    
    // 确保发布按钮显示
    this.ensurePublishButtonVisible();
    
    
    // 记录进入应用行为
    recordEnterAppAction();
    
    // 测试评论加载
    this.testCommentLoading();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadPosts(true);
    // 重新初始化发布时间为当前时间
    this.initPublishTime();
    // 重新检查用户发布权限
    this.checkPublishPermission();
    // 确保发布按钮显示
    this.ensurePublishButtonVisible();
  },

  // 下拉刷新
  onPullDownRefresh() {
    console.log('下拉刷新');
    this.setData({ refreshing: true });
    this.loadPosts(true).then(() => {
      wx.stopPullDownRefresh();
      // 记录下拉刷新行为
      recordRefreshAction();
    });
  },

  // 上拉加载更多
  onReachBottom() {
    console.log('上拉加载更多');
    if (this.data.hasMore && !this.data.loading) {
      this.loadPosts(false);
      // 记录上拉加载更多行为
      recordLoadMoreAction(this.data.currentPage + 1);
    }
  },

  // 检查云开发状态
  async checkCloudStatus() {
    console.log('检查云开发状态...');
    
    // 获取云开发信息
    const cloudInfo = getCloudInfo();
    console.log('云开发信息:', cloudInfo);
    
    if (!cloudInfo.hasCloud) {
      console.warn('云开发未初始化，将使用本地数据');
      return;
    }
    
    // 测试云开发连接
    const testResult = await testCloudConnection();
    console.log('云开发连接测试结果:', testResult);
    
    if (!testResult.success) {
      console.warn('云开发连接失败，将使用本地数据:', testResult.error);
    }
  },

  // 检查用户发布权限
  checkPublishPermission() {
    console.log('检查用户发布权限...');
    
    // 获取当前用户的openid
    const openid = wx.getStorageSync('openid');
    console.log('当前用户openid:', openid);
    
    if (!openid) {
      console.log('用户未登录，不显示发布按钮');
      this.setData({ showFab: false });
      return;
    }
    
    // 检查openid是否在允许列表中
    const { allowedOpenids } = this.data;
    const hasPermission = allowedOpenids.includes(openid);
    
    console.log('用户发布权限检查结果:', {
      openid,
      allowedOpenids,
      hasPermission
    });
    
    // 根据权限设置发布按钮显示状态
    this.setData({ showFab: hasPermission });
    
    if (hasPermission) {
      console.log('✅ 用户有发布权限，显示发布按钮');
    } else {
      console.log('❌ 用户无发布权限，隐藏发布按钮');
    }
  },


  // 初始化日期信息
  initDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    try {
      // 获取农历日期
      const lunarDate = getTodayLunarDate();
      
      this.setData({
        currentDate: {
          year: year.toString(),
          month: month.toString(),
          day: day.toString()
        },
        lunarDate: lunarDate
      });
      
      console.log('日期初始化完成:', {
        solar: `${year}年${month}月${day}日`,
        lunar: lunarDate
      });
    } catch (error) {
      console.error('农历日期获取失败:', error);
      // 如果农历获取失败，不设置农历日期，只设置公历日期
      this.setData({
        currentDate: {
          year: year.toString(),
          month: month.toString(),
          day: day.toString()
        },
        lunarDate: ''
      });
    }
  },

  // 初始化倒计时
  initCountdown() {
    try {
      // 目标日期：2025年9月17日
      const targetDate = new Date(2025, 8, 17); // 月份从0开始，所以8代表9月
      const currentDate = new Date();
      
      // 计算时间差（毫秒）
      const timeDiff = targetDate.getTime() - currentDate.getTime();
      
      // 转换为天数
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      console.log('倒计时计算:', {
        targetDate: targetDate.toDateString(),
        currentDate: currentDate.toDateString(),
        daysDiff: daysDiff
      });
      
      this.setData({
        countdownDays: daysDiff
      });
      
      console.log(`距离2025年9月17日还有 ${daysDiff} 天`);
    } catch (error) {
      console.error('倒计时计算失败:', error);
      this.setData({
        countdownDays: 0
      });
    }
  },

  // 加载动态数据（分页）
  async loadPosts(refresh = false) {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      const newPosts = await this.loadPostsFromCloud(refresh);
      
      if (refresh) {
        // 刷新时替换所有数据
        console.log('刷新数据，设置posts:', newPosts);
        console.log('第一个动态的评论:', newPosts[0]?.comments);
        this.setData({ 
          posts: newPosts,
          currentPage: 1,
          hasMore: newPosts.length === this.data.pageSize
        });
      } else {
        // 加载更多时追加数据
        const allPosts = [...this.data.posts, ...newPosts];
        console.log('加载更多数据，设置posts:', allPosts);
        console.log('第一个动态的评论:', allPosts[0]?.comments);
        this.setData({ 
          posts: allPosts,
          currentPage: this.data.currentPage + 1,
          hasMore: newPosts.length === this.data.pageSize
        });
      }
      
      // 保存到本地存储作为缓存
      wx.setStorageSync('posts', this.data.posts);
      
      // 强制更新页面数据
      console.log('最终设置的posts数据:', this.data.posts);
      console.log('第一个动态的最终评论:', this.data.posts[0]?.comments);
      
      // 强制触发页面重新渲染
      this.setData({
        posts: [...this.data.posts]
      });
      
    } catch (error) {
      console.error('从云数据库加载动态失败:', error);
      // 如果云数据库加载失败，使用本地存储
      const posts = wx.getStorageSync('posts') || [];
      this.setData({ posts });
    } finally {
      this.setData({ loading: false, refreshing: false });
    }
  },

  // 从云数据库加载动态数据（优化分页策略）
  async loadPostsFromCloud(refresh = false): Promise<Post[]> {
    // 如果已经获取过所有数据且不是刷新，直接使用本地数据分页
    if (!refresh && this.data.allPostsData && this.data.allPostsData.length > 0) {
      console.log('使用本地缓存数据进行分页');
      const startIndex = this.data.currentPage * this.data.pageSize;
      const endIndex = startIndex + this.data.pageSize;
      return this.data.allPostsData.slice(startIndex, endIndex);
    }
    
    // 获取所有数据
    console.log('从云函数获取所有posts数据');
    const allPosts = await getPosts();
    
    // 为每个动态加载评论
    const postsWithComments = await this.loadCommentsForPosts(allPosts);
    console.log('loadPostsFromCloud - 评论加载完成，第一个动态的评论:', postsWithComments[0]?.comments);
    
    // 按momentTime倒序排列（最新的在前）
    postsWithComments.sort((a, b) => {
      const timeA = new Date(a.momentTime).getTime();
      const timeB = new Date(b.momentTime).getTime();
      return timeB - timeA;
    });
    
    // 缓存所有数据
    this.setData({
      allPostsData: postsWithComments
    });
    console.log('loadPostsFromCloud - 数据缓存完成，第一个动态的评论:', this.data.allPostsData[0]?.comments);
    
    if (refresh) {
      // 刷新时返回第一页数据
      return postsWithComments.slice(0, this.data.pageSize);
    } else {
      // 加载更多时返回下一页数据
      const startIndex = this.data.currentPage * this.data.pageSize;
      const endIndex = startIndex + this.data.pageSize;
      return postsWithComments.slice(startIndex, endIndex);
    }
  },

  // 为动态列表加载评论
  async loadCommentsForPosts(posts: Post[]): Promise<Post[]> {
    console.log('开始为动态加载评论，动态数量:', posts.length);
    
    // 先检查是否有评论数据
    if (posts.length === 0) {
      console.log('没有动态数据，跳过评论加载');
      return posts;
    }
    
    const postsWithComments = await Promise.all(
      posts.map(async (post) => {
        try {
          console.log(`加载动态 ${post.id} 的评论...`);
          const comments = await getComments(post.id);
          console.log(`动态 ${post.id} 的评论数量:`, comments.length);
          
          if (comments.length > 0) {
            // 按时间正序排列（最早的在前）
            const sortedComments = comments.sort((a, b) => a.createdAt - b.createdAt);
            const formattedComments = sortedComments.map(comment => ({
              ...comment,
              time: this.formatTime(new Date(comment.createdAt))
            }));
            
            console.log(`动态 ${post.id} 格式化后的评论:`, formattedComments);
            
            return { 
              ...post, 
              comments: formattedComments,
              showAllComments: false // 默认折叠状态
            };
          } else {
            console.log(`动态 ${post.id} 没有评论`);
            return { 
              ...post, 
              comments: [],
              showAllComments: false
            };
          }
        } catch (error) {
          console.error(`加载动态 ${post.id} 的评论失败:`, error);
          return { ...post, comments: [], showAllComments: false };
        }
      })
    );
    
    console.log('所有动态评论加载完成，结果:', postsWithComments);
    console.log('第一个动态的评论:', postsWithComments[0]?.comments);
    
    return postsWithComments;
  },

  // 保存动态数据
  savePosts() {
    wx.setStorageSync('posts', this.data.posts);
  },




  // 显示发布弹窗
  showPublishPopup() {
    // 重新初始化发布时间为当前时间
    this.initPublishTime();
    this.setData({ 
      showPublish: true,
      showFab: false // 隐藏发布按钮
    });
    
    // 延迟确保弹窗内容完全显示
    setTimeout(() => {
      this.ensurePopupContentVisible();
    }, 100);
  },

  // 隐藏发布弹窗
  hidePublishPopup() {
    this.setData({ 
      showPublish: false,
      showFab: true // 重新显示发布按钮
    });
  },

  // 发布弹窗显示状态变化
  onPublishVisibleChange(e: any) {
    this.setData({ 
      showPublish: e.detail.visible,
      showFab: !e.detail.visible // 弹窗关闭时显示发布按钮，弹窗打开时隐藏发布按钮
    });
  },

  // 文字内容变化
  onTextChange(e: any) {
    this.setData({ publishText: e.detail.value });
  },

  // 选择图片
  chooseImage() {
    console.log('chooseImage 方法被调用');
    
    const { publishImages } = this.data;
    const remainingCount = 9 - publishImages.length;
    
    console.log('当前图片数量:', publishImages.length, '剩余可添加:', remainingCount);
    
    if (remainingCount <= 0) {
      wx.showToast({
        title: '最多只能选择9张图片',
        icon: 'none'
      });
      return;
    }
    
    wx.chooseMedia({
      count: remainingCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        console.log('选择图片成功:', res);
        const newImages = res.tempFiles.map(file => file.tempFilePath);
        this.setData({
          publishImages: [...publishImages, ...newImages]
        });
        console.log('更新后的图片数组:', [...publishImages, ...newImages]);
      },
      fail: (error) => {
        console.error('选择图片失败', error);
        // 不显示错误提示，用户可能只是取消了选择
      }
    });
  },

  // 移除图片
  removeImage(e: any) {
    const index = e.currentTarget.dataset.index;
    const { publishImages } = this.data;
    publishImages.splice(index, 1);
    this.setData({ publishImages });
  },

  // 初始化发布时间
  initPublishTime() {
    const now = new Date();
    const publishTime = now.toISOString();
    const formattedTime = this.formatTime(now);
    
    console.log('初始化发布时间:', { now, publishTime, formattedTime });
    
    this.setData({
      publishTime: publishTime,
      formattedPublishTime: formattedTime
    });
    
    // 初始化picker数据
    this.initTimePickerData(now);
    
    console.log('发布时间初始化完成:', this.data.publishTime);
  },

  // 初始化时间选择器数据
  initTimePickerData(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();

    // 生成年份选项（当前年份前后5年）
    const years = [];
    for (let i = year - 5; i <= year + 5; i++) {
      years.push(i.toString());
    }

    // 生成月份选项
    const months = [];
    for (let i = 1; i <= 12; i++) {
      months.push(i.toString().padStart(2, '0'));
    }

    // 生成日期选项（根据当前月份）
    const days = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i.toString().padStart(2, '0'));
    }

    // 生成小时选项
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(i.toString().padStart(2, '0'));
    }

    // 生成分钟选项
    const minutes = [];
    for (let i = 0; i < 60; i++) {
      minutes.push(i.toString().padStart(2, '0'));
    }

    // 计算当前选中的索引
    const yearIndex = years.indexOf(year.toString());
    const monthIndex = month - 1;
    const dayIndex = day - 1;
    const hourIndex = hour;
    const minuteIndex = minute;

    this.setData({
      timePickerRange: [years, months, days, hours, minutes] as any,
      timePickerValue: [yearIndex, monthIndex, dayIndex, hourIndex, minuteIndex]
    });
  },

  // 原生picker时间选择器变化
  onTimePickerChange(e: any) {
    const { timePickerRange } = this.data;
    const [yearIndex, monthIndex, dayIndex, hourIndex, minuteIndex] = e.detail.value;
    
    const year = parseInt(timePickerRange[0][yearIndex]);
    const month = parseInt(timePickerRange[1][monthIndex]);
    const day = parseInt(timePickerRange[2][dayIndex]);
    const hour = parseInt(timePickerRange[3][hourIndex]);
    const minute = parseInt(timePickerRange[4][minuteIndex]);
    
    const selectedDate = new Date(year, month - 1, day, hour, minute);
    const publishTime = selectedDate.toISOString();
    const formattedTime = this.formatTime(selectedDate);
    
    this.setData({
      publishTime: publishTime,
      formattedPublishTime: formattedTime,
      timePickerValue: [yearIndex, monthIndex, dayIndex, hourIndex, minuteIndex]
    });
  },

  // 原生picker列变化（处理月份变化时更新日期选项）
  onTimePickerColumnChange(e: any) {
    const { column, value } = e.detail;
    const { timePickerRange, timePickerValue } = this.data;
    
    // 如果月份发生变化，需要更新日期选项
    if (column === 1) {
      const yearIndex = timePickerValue[0];
      const monthIndex = value;
      const year = parseInt(timePickerRange[0][yearIndex]);
      const month = parseInt(timePickerRange[1][monthIndex]);
      
      // 计算该月的天数
      const daysInMonth = new Date(year, month, 0).getDate();
      const days = [];
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(i.toString().padStart(2, '0'));
      }
      
      // 更新日期选项
      const newTimePickerRange = [...timePickerRange] as any;
      newTimePickerRange[2] = days;
      
      // 如果当前选中的日期超出了新月份的天数，则选择最后一天
      let dayIndex = timePickerValue[2];
      if (dayIndex >= daysInMonth) {
        dayIndex = daysInMonth - 1;
      }
      
      const newTimePickerValue = [...timePickerValue];
      newTimePickerValue[1] = monthIndex;
      newTimePickerValue[2] = dayIndex;
      
      this.setData({
        timePickerRange: newTimePickerRange,
        timePickerValue: newTimePickerValue
      });
    }
  },

  // 格式化momentTime显示
  formatMomentTime(momentTime: string): string {
    const date = new Date(momentTime);
    return this.formatTime(date);
  },

  // 格式化momentTime为简洁格式 (10/4 20:50)
  formatMomentTimeShort(momentTime: string): string {
    console.log('格式化momentTime');
    if (!momentTime) return '';
    
    const date = new Date(momentTime);
    const month = date.getMonth() + 1; // 月份从0开始，需要+1
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    // 格式化为 M/D HH:MM
    const formattedTime = `${month}/${day} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    return formattedTime;
  },

  // 图片点击预览
  onImageTap(e: any) {
    const { url, postid } = e.currentTarget.dataset;
    console.log('点击图片预览:', url);
    
    // 显示图片预览
    this.setData({
      showImagePreview: true,
      previewImageUrl: url
    });
    
    // 记录图片查看行为
    recordImageViewAction(url, postid || '');
  },

  // 关闭图片预览
  onImagePreviewClose() {
    this.setData({
      showImagePreview: false,
      previewImageUrl: '',
      imageScale: 1,
      imageTranslateX: 0,
      imageTranslateY: 0
    });
  },

  // 图片缩放开始
  onImageTouchStart(e: any) {
    if (e.touches.length === 2) {
      // 双指触摸开始
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      this.setData({
        startDistance: distance,
        startScale: this.data.imageScale
      });
    }
  },

  // 图片缩放中
  onImageTouchMove(e: any) {
    if (e.touches.length === 2) {
      // 双指缩放
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const { startDistance, startScale } = this.data;
      if (startDistance > 0) {
        const scale = startScale * (distance / startDistance);
        const clampedScale = Math.max(0.5, Math.min(scale, 3)); // 限制缩放范围 0.5-3倍
        
        this.setData({
          imageScale: clampedScale
        });
      }
    } else if (e.touches.length === 1 && this.data.imageScale > 1) {
      // 单指拖拽（仅在放大状态下）
      const touch = e.touches[0];
      const deltaX = touch.clientX - (this.data.lastTouchX || touch.clientX);
      const deltaY = touch.clientY - (this.data.lastTouchY || touch.clientY);
      
      this.setData({
        imageTranslateX: this.data.imageTranslateX + deltaX,
        imageTranslateY: this.data.imageTranslateY + deltaY,
        lastTouchX: touch.clientX,
        lastTouchY: touch.clientY
      });
    }
  },

  // 图片触摸结束
  onImageTouchEnd() {
    this.setData({
      startDistance: 0,
      lastTouchX: 0,
      lastTouchY: 0
    });
  },

  // 图片长按保存
  onImageLongPress() {
    const { previewImageUrl } = this.data;
    if (!previewImageUrl) return;
    
    wx.showActionSheet({
      itemList: ['保存图片'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.saveImageToAlbum(previewImageUrl);
        }
      }
    });
  },

  // 保存图片到相册
  saveImageToAlbum(imageUrl: string) {
    wx.showLoading({ title: '保存中...' });
    
    // 如果是云存储图片，需要先下载
    if (imageUrl.startsWith('cloud://')) {
      wx.cloud.downloadFile({
        fileID: imageUrl,
        success: (res) => {
          this.saveLocalImage(res.tempFilePath);
        },
        fail: (error) => {
          console.error('下载图片失败:', error);
          wx.hideLoading();
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          });
        }
      });
    } else {
      // 直接保存网络图片
      this.saveLocalImage(imageUrl);
    }
  },

  // 保存本地图片
  saveLocalImage(imagePath: string) {
    wx.saveImageToPhotosAlbum({
      filePath: imagePath,
      success: () => {
        wx.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      },
      fail: (error) => {
        console.error('保存图片失败:', error);
        wx.hideLoading();
        
        if (error.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '提示',
            content: '需要授权访问相册才能保存图片',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        } else {
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          });
        }
      }
    });
  },


  // 重置发布内容
  resetPublish() {
    console.log('resetPublish 方法被调用');
    this.setData({
      publishText: '',
      publishImages: []
    });
    this.initPublishTime();
  },

  // 提交发布
  async submitPublish() {
    console.log('submitPublish 方法被调用');
    
    const { publishText, publishImages } = this.data;
    console.log('发布内容:', { publishText, publishImages });
    
    if (!publishText.trim() && publishImages.length === 0) {
      wx.showToast({
        title: '请输入内容或选择图片',
        icon: 'none'
      });
      return;
    }

    // 检查用户登录状态
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    this.setData({ publishing: true });

    try {
      // 上传图片到云存储
      const uploadedImages = await this.uploadImages(publishImages);
      
      // 获取用户信息
      const userInfo = wx.getStorageSync('userInfo') || {};
      
      // 创建新动态
      const momentTime = new Date(this.data.publishTime);
      const newPost: Post = {
        id: Date.now().toString(),
        openid: openid,
        text: publishText.trim(),
        images: uploadedImages,
        avatar: userInfo.avatarUrl || 'https://i.pravatar.cc/80?img=1',
        time: this.formatTime(momentTime),
        momentTime: this.data.publishTime,
        createdAt: Date.now()
      };

      // 保存到云数据库
      await this.savePostToCloud(newPost);

      // 更新 postStat 缓存
      try {
        await incrementPostStatCache(openid, {
          text: newPost.text,
          images: newPost.images
        });
      } catch (cacheError) {
        console.error('更新 postStat 缓存失败:', cacheError);
        // 缓存更新失败不影响发布流程
      }

      // 记录发布行为
      recordPublishAction(newPost);

      // 更新本地数据 - 按momentTime排序插入
      const allPosts = [newPost, ...this.data.posts];
      // 重新按momentTime排序
      allPosts.sort((a, b) => {
        const timeA = new Date(a.momentTime).getTime();
        const timeB = new Date(b.momentTime).getTime();
        return timeB - timeA;
      });
      
      // 同时更新缓存的所有数据
      const updatedAllPostsData = [newPost, ...(this.data.allPostsData || [])];
      updatedAllPostsData.sort((a, b) => {
        const timeA = new Date(a.momentTime).getTime();
        const timeB = new Date(b.momentTime).getTime();
        return timeB - timeA;
      });
      
      this.setData({ 
        posts: allPosts,
        allPostsData: updatedAllPostsData
      });
      this.savePosts();

      // 重置发布内容
      this.resetPublish();
      this.hidePublishPopup();

      // 显示成功提示
      wx.showToast({
        title: '发布成功',
        icon: 'success'
      });

    } catch (error) {
      console.error('发布失败:', error);
      wx.showToast({
        title: '发布失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ publishing: false });
    }
  },

  // 上传图片到云存储
  async uploadImages(images: string[]): Promise<string[]> {
    if (images.length === 0) return [];
    
    const uploadPromises = images.map(async (imagePath, index) => {
      try {
        const cloudPath = `images/posts/${Date.now()}_${index}.jpg`;
        const result = await uploadFile(imagePath, cloudPath);
        return result.fileID;
      } catch (error) {
        console.error('上传图片失败:', error);
        throw error;
      }
    });

    return await Promise.all(uploadPromises);
  },

  // 保存动态到云数据库
  async savePostToCloud(post: Post) {
    return await addPost(post);
  },

  // 长按动态项
  onPostLongPress(e: any) {
    const postId = e.currentTarget.dataset.id;
    const currentOpenid = wx.getStorageSync('openid');
    
    console.log('长按动态项:', { postId, currentOpenid });
    
    // 1. 检查用户是否已登录
    if (!currentOpenid) {
      console.log('用户未登录，无法删除动态');
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 2. 查找对应的动态
    const post = this.data.posts.find(p => p.id === postId);
    if (!post) {
      console.log('动态不存在:', postId);
      wx.showToast({
        title: '动态不存在',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 3. 检查动态是否已被删除
    if (post.deleted) {
      console.log('动态已被删除:', postId);
      wx.showToast({
        title: '动态已被删除',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 4. 检查权限：只有动态的创建者才能删除
    if (post.openid !== currentOpenid) {
      console.log('权限不足:', { 
        postOpenid: post.openid, 
        currentOpenid: currentOpenid 
      });
      return;
    }

    // 5. 权限验证通过，显示删除选项
    console.log('权限验证通过，显示删除选项');
    this.setData({
      selectedPostId: postId,
      showDeleteOptions: true
    });
  },

  // 删除选项弹窗显示状态变化
  onDeleteOptionsVisibleChange(e: any) {
    this.setData({
      showDeleteOptions: e.detail.visible
    });
  },

  // 确认删除
  async confirmDelete() {
    const { selectedPostId } = this.data;
    const currentOpenid = wx.getStorageSync('openid');
    
    if (!selectedPostId) {
      console.log('没有选中的动态ID');
      return;
    }

    if (!currentOpenid) {
      console.log('用户未登录，无法删除动态');
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // 再次验证权限（防止在弹窗显示期间权限状态发生变化）
    const post = this.data.posts.find(p => p.id === selectedPostId);
    if (!post) {
      console.log('动态不存在:', selectedPostId);
      wx.showToast({
        title: '动态不存在',
        icon: 'none'
      });
      this.setData({
        showDeleteOptions: false,
        selectedPostId: ''
      });
      return;
    }

    if (post.openid !== currentOpenid) {
      console.log('权限不足，无法删除他人动态:', {
        postOpenid: post.openid,
        currentOpenid: currentOpenid
      });
      wx.showToast({
        title: '权限不足',
        icon: 'none'
      });
      this.setData({
        showDeleteOptions: false,
        selectedPostId: ''
      });
      return;
    }

    try {
      wx.showLoading({ title: '删除中...' });
      
      // 软删除：更新云数据库中的deleted字段
      await this.softDeletePostFromCloud(selectedPostId);
      
      // 更新 postStat 缓存
      try {
        await decrementPostStatCache(currentOpenid, {
          text: post.text,
          images: post.images
        });
      } catch (cacheError) {
        console.error('更新 postStat 缓存失败:', cacheError);
        // 缓存更新失败不影响删除流程
      }
      
      // 从本地数据中移除（不显示已删除的动态）
      const posts = this.data.posts.filter(post => post.id !== selectedPostId);
      const allPostsData = (this.data.allPostsData || []).filter(post => post.id !== selectedPostId);
      
      this.setData({ 
        posts,
        allPostsData
      });
      this.savePosts();
      
      // 记录删除行为
      recordDeleteAction(selectedPostId);
      
      // 关闭弹窗
      this.setData({
        showDeleteOptions: false,
        selectedPostId: ''
      });
      
      wx.hideLoading();
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('删除失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '删除失败，请重试',
        icon: 'none'
      });
    }
  },

  // 取消删除
  cancelDelete() {
    this.setData({
      showDeleteOptions: false,
      selectedPostId: ''
    });
  },

  // 从云数据库删除动态
  async deletePostFromCloud(postId: string) {
    return await deletePost(postId);
  },

  // 软删除动态（设置deleted为true）
  async softDeletePostFromCloud(postId: string) {
    const currentOpenid = wx.getStorageSync('openid');
    
    return new Promise((resolve, reject) => {
      try {
        const db = wx.cloud.database();
        const posts = db.collection('posts');
      
      // 查找动态
      posts.where({
        id: postId
      }).get({
        success: (res) => {
          if (res.data.length > 0) {
            const post = res.data[0];
            
            // 在云数据库层面再次验证权限
            if (post.openid !== currentOpenid) {
              console.error('云数据库权限验证失败:', {
                postOpenid: post.openid,
                currentOpenid: currentOpenid
              });
              reject(new Error('权限不足，无法删除他人动态'));
              return;
            }
            
            // 检查是否已被删除
            if (post.deleted) {
              console.log('动态已被删除:', postId);
              reject(new Error('动态已被删除'));
              return;
            }
            
            // 更新deleted字段
            posts.doc(post._id).update({
              data: {
                deleted: true,
                updateTime: new Date()
              },
              success: (updateRes) => {
                console.log('软删除成功', updateRes);
                resolve(updateRes);
              },
              fail: (error) => {
                console.error('软删除失败', error);
                reject(error);
              }
            });
          } else {
            reject(new Error('动态不存在'));
          }
        },
        fail: (error) => {
          console.error('查找动态失败', error);
          reject(error);
        }
      });
      } catch (error) {
        console.error('云数据库操作失败:', error);
        reject(error);
      }
    });
  },

  // 格式化时间
  formatTime(date: Date): string {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    return `${month}/${day} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  },

  // 初始化天气
  async initWeather() {
    console.log('开始获取天气信息...');
    
    // 使用上海坐标 (经度: 121.4737, 纬度: 31.2304) 用于显示
    const shanghaiLocation = '121.4737,31.2304';
    const shanghaiCityCode = '310100'; // 上海城市代码
    
    console.log('使用上海城市代码:', shanghaiCityCode);
    console.log('显示坐标:', shanghaiLocation);
    
    // 解析坐标用于显示
    const [longitude, latitude] = shanghaiLocation.split(',');
    
    // 保存坐标信息到数据中
    this.setData({
      'weatherInfo.coordinates': shanghaiLocation,
      'weatherInfo.location': `${parseFloat(longitude).toFixed(4)}, ${parseFloat(latitude).toFixed(4)}`
    });
    
    try {
      // 首先尝试使用高德地图API直接获取天气
      const weatherData = await this.getWeatherFromAmap(shanghaiCityCode);
      if (weatherData) {
        console.log('高德地图天气数据获取成功:', weatherData);
        this.updateWeatherInfo(weatherData);
        return;
      }
    } catch (error: any) {
      console.error('高德地图API调用失败:', error);
      
      // 如果是域名白名单问题，尝试使用云函数
      if (error.errMsg && error.errMsg.includes('url not in domain list')) {
        console.log('检测到域名白名单问题，尝试使用云函数...');
        try {
          await this.tryCloudFunctionWeather(shanghaiCityCode);
          return;
        } catch (cloudError) {
          console.error('云函数调用也失败:', cloudError);
        }
      }
    }
    
    // 如果所有方法都失败，使用模拟数据
    console.log('所有天气获取方法都失败，使用模拟数据');
    this.useMockWeatherData();
  },

  // 从高德地图API获取天气数据
  async getWeatherFromAmap(cityCode: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const apiKey = '39c8ba8c38a9cf6e1001ef801da7bd4e';
      const url = `https://restapi.amap.com/v3/weather/weatherInfo?city=${cityCode}&key=${apiKey}`;
      
      console.log('请求高德地图天气API:', url);
      
      wx.request({
        url: url,
        method: 'GET',
        success: (res) => {
          console.log('高德地图API响应:', res);
          console.log('响应状态码:', res.statusCode);
          console.log('响应数据:', res.data);
          
          if (res.statusCode === 200 && res.data) {
            const data = res.data as any;
            console.log('API返回数据状态:', data.status);
            console.log('API返回数据信息:', data.info);
            
            if (data.status === '1' && data.lives && data.lives.length > 0) {
              const weatherInfo = data.lives[0];
              console.log('解析天气数据:', weatherInfo);
              console.log('天气数据字段:', Object.keys(weatherInfo));
              resolve(weatherInfo);
            } else {
              console.error('API返回数据格式错误:', data);
              console.error('数据状态:', data.status);
              console.error('数据信息:', data.info);
              reject(new Error(`API返回数据格式错误: ${data.info || '未知错误'}`));
            }
          } else {
            console.error('API请求失败，状态码:', res.statusCode);
            reject(new Error(`API请求失败，状态码: ${res.statusCode}`));
          }
        },
        fail: (error: any) => {
          console.error('网络请求失败:', error);
          
          // 检查是否是域名白名单问题
          if (error.errMsg && error.errMsg.includes('url not in domain list')) {
            console.warn('域名白名单问题，请配置域名白名单或开启"不校验合法域名"');
            console.log('解决方案:');
            console.log('1. 在微信开发者工具中勾选"不校验合法域名"');
            console.log('2. 或在微信公众平台配置服务器域名: https://restapi.amap.com');
          }
          
          reject(error);
        }
      });
    });
  },

  // 尝试使用云函数获取天气（备用方案）
  async tryCloudFunctionWeather(cityCode: string): Promise<void> {
    if (!wx.cloud) {
      throw new Error('云开发未初始化');
    }
    
    console.log('尝试使用云函数获取天气...');
    
    const result = await wx.cloud.callFunction({
      name: 'getWeather',
      data: {
        cityCode: cityCode
      }
    });
    
    console.log('云函数调用结果:', result);
    
    if (result.result && typeof result.result === 'object' && result.result.success) {
      console.log('云函数天气数据获取成功:', result.result.data);
      this.updateWeatherInfo(result.result.data);
    } else {
      throw new Error('云函数返回数据格式错误');
    }
  },

  // 更新天气信息
  updateWeatherInfo(data: any) {
    try {
      let weatherData = null;
      
      console.log('处理天气数据:', data);
      console.log('数据类型:', typeof data);
      console.log('数据键:', Object.keys(data || {}));
      
      // 处理不同的数据格式
      if (data.lives && data.lives.length > 0) {
        // 云函数返回的完整API响应格式
        weatherData = data.lives[0];
        console.log('使用云函数数据格式');
      } else if (data.forecasts && data.forecasts.length > 0 && data.forecasts[0].casts && data.forecasts[0].casts.length > 0) {
        // 预报数据格式
        weatherData = data.forecasts[0].casts[0];
        console.log('使用预报数据格式');
      } else if (data.temperature && data.weather) {
        // 直接API调用返回的单个天气对象格式
        weatherData = data;
        console.log('使用直接API数据格式');
      } else {
        console.log('未知数据格式:', data);
        this.handleWeatherError('天气数据格式错误');
        return;
      }

      if (weatherData) {
        console.log('解析的天气数据:', weatherData);
        
        const weatherInfo = {
          temp: weatherData.temperature || '--',
          desc: weatherData.weather || '未知',
          icon: this.getWeatherIcon(weatherData.weather || ''),
          city: weatherData.city || '上海市',
          winddirection: weatherData.winddirection || '',
          windpower: weatherData.windpower || '',
          humidity: weatherData.humidity || '',
          loading: false,
          error: false,
          location: this.data.weatherInfo.location || '',
          coordinates: this.data.weatherInfo.coordinates || ''
        };

        this.setData({ weatherInfo });
        console.log('天气信息更新成功:', weatherInfo);
      } else {
        console.log('无法解析天气数据:', data);
        this.handleWeatherError('天气数据格式错误');
      }
    } catch (error) {
      console.error('处理天气数据时出错:', error);
      this.handleWeatherError(error);
    }
  },

  // 处理天气错误
  handleWeatherError(error: any) {
    console.error('天气获取失败:', error);
    
    const weatherInfo = {
      temp: '--',
      desc: '暂无数据',
      icon: '🌤️',
      city: '上海市',
      winddirection: '',
      windpower: '',
      humidity: '',
      loading: false,
      error: false, // 不显示错误状态
      location: this.data.weatherInfo.location || '',
      coordinates: this.data.weatherInfo.coordinates || ''
    };

    this.setData({ weatherInfo });
  },

  // 根据天气描述获取对应的图标
  getWeatherIcon(weather: string): string {
    if (!weather) return '🌤️';
    
    const weatherLower = weather.toLowerCase();
    
    // 根据高德地图API返回的天气描述进行匹配
    if (weatherLower.includes('晴')) {
      return '☀️';
    } else if (weatherLower.includes('多云')) {
      return '⛅';
    } else if (weatherLower.includes('阴')) {
      return '☁️';
    } else if (weatherLower.includes('小雨')) {
      return '🌦️';
    } else if (weatherLower.includes('中雨')) {
      return '🌧️';
    } else if (weatherLower.includes('大雨') || weatherLower.includes('暴雨')) {
      return '⛈️';
    } else if (weatherLower.includes('雪')) {
      return '❄️';
    } else if (weatherLower.includes('雾') || weatherLower.includes('霾')) {
      return '☁️';
    } else if (weatherLower.includes('雷')) {
      return '⛈️';
    } else if (weatherLower.includes('风')) {
      return '💨';
    } else {
      return '🌤️';
    }
  },

  // 使用模拟天气数据
  useMockWeatherData() {
    console.log('使用模拟天气数据');
    
    // 生成一些随机的天气数据，让显示更真实
    const weathers = ['晴', '多云', '阴', '小雨', '中雨'];
    const windDirections = ['东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风', '北风'];
    const temperatures = ['18', '20', '22', '24', '26', '28', '30'];
    const humidities = ['60', '65', '70', '75', '80'];
    
    const randomWeather = weathers[Math.floor(Math.random() * weathers.length)];
    const randomTemp = temperatures[Math.floor(Math.random() * temperatures.length)];
    const randomWind = windDirections[Math.floor(Math.random() * windDirections.length)];
    const randomHumidity = humidities[Math.floor(Math.random() * humidities.length)];
    
    const mockWeatherData = {
      lives: [{
        city: '上海市',
        weather: randomWeather,
        temperature: randomTemp,
        winddirection: randomWind,
        windpower: Math.floor(Math.random() * 5 + 1).toString(),
        humidity: randomHumidity
      }]
    };
    
    console.log('模拟天气数据:', mockWeatherData);
    this.updateWeatherInfo(mockWeatherData);
  },

  // 手动刷新天气
  refreshWeather() {
    console.log('手动刷新上海天气');
    this.setData({
      'weatherInfo.loading': true,
      'weatherInfo.error': false
    });
    this.initWeather();
  },

  // 调试天气API响应
  async debugWeatherAPI() {
    console.log('=== 开始调试天气API ===');
    
    const apiKey = '39c8ba8c38a9cf6e1001ef801da7bd4e';
    const cityCode = '310100';
    const url = `https://restapi.amap.com/v3/weather/weatherInfo?city=${cityCode}&key=${apiKey}`;
    
    console.log('请求URL:', url);
    
    try {
      const result = await this.getWeatherFromAmap(cityCode);
      console.log('API调用成功，返回数据:', result);
      console.log('数据类型:', typeof result);
      console.log('数据键:', Object.keys(result || {}));
      
      // 测试数据解析
      console.log('测试数据解析...');
      this.updateWeatherInfo(result);
      
    } catch (error) {
      console.error('API调用失败:', error);
    }
  },

  // 键盘弹起事件
  onKeyboardShow(e: any) {
    console.log('键盘弹起:', e);
    this.setData({
      keyboardHeight: e.detail.height,
      isKeyboardShow: true
    });
    
    // 延迟调整布局，防止抖动
    setTimeout(() => {
      this.adjustLayoutForKeyboard();
    }, 100);
  },

  // 键盘收起事件
  onKeyboardHide(e: any) {
    console.log('键盘收起:', e);
    this.setData({
      keyboardHeight: 0,
      isKeyboardShow: false
    });
    
    // 恢复布局
    setTimeout(() => {
      this.restoreLayout();
    }, 100);
  },

  // 调整布局以适应键盘
  adjustLayoutForKeyboard() {
    const { keyboardHeight } = this.data;
    if (keyboardHeight > 0) {
      // 可以在这里添加额外的布局调整逻辑
      console.log('调整布局以适应键盘，高度:', keyboardHeight);
      
      // 确保textarea可见
      const query = wx.createSelectorQuery();
      query.select('.publish-textarea').boundingClientRect();
      query.exec((res) => {
        if (res[0]) {
          const textareaRect = res[0];
          const systemInfo = wx.getSystemInfoSync();
          const windowHeight = systemInfo.windowHeight;
          
          // 如果textarea被键盘遮挡，滚动到可见位置
          if (textareaRect.bottom > windowHeight - keyboardHeight) {
            query.select('.publish-form').scrollOffset();
            query.exec((scrollRes) => {
              if (scrollRes[0]) {
                const scrollTop = scrollRes[0].scrollTop;
                const targetScrollTop = scrollTop + (textareaRect.bottom - (windowHeight - keyboardHeight)) + 50;
                
                // 滚动到textarea可见位置
                wx.pageScrollTo({
                  scrollTop: targetScrollTop,
                  duration: 300
                });
              }
            });
          }
        }
      });
    }
  },

  // 恢复布局
  restoreLayout() {
    console.log('恢复布局');
    // 可以在这里添加恢复布局的逻辑
  },

  // 确保发布按钮显示
  ensurePublishButtonVisible() {
    console.log('确保发布按钮显示');
    
    // 使用选择器查询确保按钮存在
    const query = wx.createSelectorQuery();
    query.select('.publish-fab-native').boundingClientRect();
    query.exec((res) => {
      if (res[0]) {
        console.log('✅ 发布按钮已存在，位置:', res[0]);
        console.log('✅ 按钮尺寸:', res[0].width, 'x', res[0].height);
        console.log('✅ 按钮位置: right', res[0].right, 'bottom', res[0].bottom);
        
        // 检查按钮是否在视窗内
        const systemInfo = wx.getSystemInfoSync();
        const windowHeight = systemInfo.windowHeight;
        const windowWidth = systemInfo.windowWidth;
        
        console.log('✅ 屏幕尺寸:', windowWidth, 'x', windowHeight);
        console.log('✅ 按钮是否在视窗内:', res[0].top >= 0 && res[0].left >= 0 && res[0].bottom <= windowHeight && res[0].right <= windowWidth);
      } else {
        console.log('❌ 发布按钮未找到，可能需要重新渲染');
        // 强制重新渲染
        this.setData({}, () => {
          console.log('页面重新渲染完成');
        });
      }
    });
    
    // 延迟确保按钮可见性
    setTimeout(() => {
      this.setData({}, () => {
        console.log('发布按钮可见性检查完成');
      });
    }, 100);
    
    // 额外延迟检查
    setTimeout(() => {
      this.forceButtonVisible();
    }, 500);
  },

  // 强制按钮可见
  forceButtonVisible() {
    console.log('强制按钮可见');
    
    // 尝试通过DOM操作强制显示按钮
    const query = wx.createSelectorQuery();
    query.select('.publish-fab-native').boundingClientRect();
    query.exec((res) => {
      if (res[0]) {
        console.log('✅ 按钮强制显示成功');
      } else {
        console.log('❌ 按钮仍然不可见，尝试其他方法');
        // 可以在这里添加其他强制显示的方法
      }
    });
  },

  // 确保弹窗内容完全可见
  ensurePopupContentVisible() {
    console.log('确保弹窗内容完全可见');
    
    // 检查弹窗内容区域
    const query = wx.createSelectorQuery();
    query.select('.publish-content').boundingClientRect();
    query.select('.publish-actions').boundingClientRect();
    query.exec((res) => {
      if (res[0] && res[1]) {
        const contentRect = res[0];
        const actionsRect = res[1];
        const systemInfo = wx.getSystemInfoSync();
        
        console.log('弹窗内容区域:', contentRect);
        console.log('操作按钮区域:', actionsRect);
        console.log('屏幕高度:', systemInfo.windowHeight);
        
        // 检查按钮是否在屏幕可见区域内
        const buttonVisible = actionsRect.bottom <= systemInfo.windowHeight;
        console.log('操作按钮是否可见:', buttonVisible);
        
        if (!buttonVisible) {
          console.log('⚠️ 操作按钮不可见，需要调整弹窗高度');
          // 可以在这里添加调整弹窗高度的逻辑
        }
      }
    });
  },

  // ==================== 评论功能 ====================

  // 点击动态内容
  onMomentTap(e: any) {
    const postId = e.currentTarget.dataset.postid;
    console.log('点击动态内容，postId:', postId);
    
    // 检查用户登录状态和权限
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    const { allowedCommentOpenids } = this.data;
    if (!allowedCommentOpenids.includes(openid)) {
      wx.showToast({
        title: '您没有评论权限',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      showCommentPopup: true,
      selectedPostId: postId,
      showFab: false // 隐藏发布按钮
    });
  },

  // 点击评论按钮
  onCommentTap(e: any) {
    const postId = e.currentTarget.dataset.postid;
    console.log('点击评论按钮，postId:', postId);
    
    // 检查用户评论权限
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    const { allowedCommentOpenids } = this.data;
    if (!allowedCommentOpenids.includes(openid)) {
      wx.showToast({
        title: '您没有评论权限',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      selectedPostId: postId,
      showCommentPopup: true,
      showFab: false, // 隐藏发布按钮
      commentText: ''
    });
  },

  // 加载评论
  async loadComments(postId: string) {
    try {
      console.log('加载评论，postId:', postId);
      const comments = await getComments(postId);
      
      // 格式化评论时间
      const formattedComments = comments.map(comment => ({
        ...comment,
        time: this.formatTime(new Date(comment.createdAt))
      }));
      
      this.setData({
        currentPostComments: formattedComments
      });
      
      console.log('评论加载成功:', formattedComments);
    } catch (error) {
      console.error('加载评论失败:', error);
      wx.showToast({
        title: '加载评论失败',
        icon: 'none'
      });
    }
  },

  // 评论弹窗显示状态变化
  onCommentPopupVisibleChange(e: any) {
    this.setData({
      showCommentPopup: e.detail.visible,
      showFab: !e.detail.visible // 弹窗关闭时显示发布按钮，弹窗打开时隐藏发布按钮
    });
  },

  // 隐藏评论弹窗
  hideCommentPopup() {
    this.setData({
      showCommentPopup: false,
      showFab: true, // 重新显示发布按钮
      selectedPostId: '',
      commentText: ''
    });
  },

  // 评论文字变化
  onCommentTextChange(e: any) {
    this.setData({ commentText: e.detail.value });
  },

  // 提交评论
  async submitComment() {
    const { commentText, selectedPostId } = this.data;
    
    if (!commentText.trim()) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      });
      return;
    }
    
    // 检查用户登录状态和权限
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    const { allowedCommentOpenids } = this.data;
    if (!allowedCommentOpenids.includes(openid)) {
      wx.showToast({
        title: '您没有评论权限',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ commentSubmitting: true });
    
    try {
      // 获取用户信息
      const userInfo = wx.getStorageSync('userInfo') || {};
      
      // 创建评论对象
      const newComment: Comment = {
        id: Date.now().toString(),
        postId: selectedPostId,
        openid: openid,
        authorName: userInfo.nickName || '匿名用户',
        authorAvatar: userInfo.avatarUrl || 'https://i.pravatar.cc/80?img=1',
        content: commentText.trim(),
        time: this.formatTime(new Date()),
        createdAt: Date.now(),
        deleted: false
      };
      
      // 保存到云数据库
      await addComment(newComment);
      
      // 清空输入框并隐藏弹窗
      this.setData({
        commentText: '',
        showCommentPopup: false,
        showFab: true // 重新显示发布按钮
      });
      
      // 更新对应动态的评论数据
      this.updatePostComments(selectedPostId, [newComment]);
      
      wx.showToast({
        title: '评论成功',
        icon: 'success'
      });
      
      // 立即刷新页面数据
      this.loadPosts(true); // 强制刷新
      
      // 延迟再次刷新确保数据同步
      setTimeout(() => {
        this.loadPosts(true); // 强制刷新
      }, 1000);
      
    } catch (error) {
      console.error('发布评论失败:', error);
      wx.showToast({
        title: '评论失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ commentSubmitting: false });
    }
  },

  // 更新动态的评论数据
  updatePostComments(postId: string, newComments: Comment[]) {
    const posts = this.data.posts.map(post => {
      if (post.id === postId) {
        const existingComments = post.comments || [];
        const updatedComments = [...existingComments, ...newComments];
        // 按时间正序排列（最早的在前）
        const sortedComments = updatedComments.sort((a, b) => a.createdAt - b.createdAt);
        return { ...post, comments: sortedComments };
      }
      return post;
    });
    
    const allPostsData = this.data.allPostsData.map(post => {
      if (post.id === postId) {
        const existingComments = post.comments || [];
        const updatedComments = [...existingComments, ...newComments];
        // 按时间正序排列（最早的在前）
        const sortedComments = updatedComments.sort((a, b) => a.createdAt - b.createdAt);
        return { ...post, comments: sortedComments };
      }
      return post;
    });
    
    // 更新数据
    this.setData({
      posts,
      allPostsData
    });
    
    // 强制触发页面重新渲染
    setTimeout(() => {
      this.setData({
        posts: [...this.data.posts]
      });
    }, 100);
    
    // 保存到本地存储
    this.savePosts();
  },

  // 长按评论（在弹窗中）
  onCommentLongPressPopup(e: any) {
    const commentId = e.currentTarget.dataset.commentid;
    const postId = e.currentTarget.dataset.postid;
    const currentOpenid = wx.getStorageSync('openid');
    
    console.log('长按评论（弹窗中）:', { commentId, postId, currentOpenid });
    
    // 检查用户是否已登录
    if (!currentOpenid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    // 查找对应的评论
    const comment = this.data.currentPostComments.find(c => c.id === commentId);
    if (!comment) {
      wx.showToast({
        title: '评论不存在',
        icon: 'none'
      });
      return;
    }
    
    // 检查权限：只有评论的作者才能删除
    if (comment.openid !== currentOpenid) {
      return;
    }
    
    // 显示删除选项
    this.setData({
      selectedCommentId: commentId,
      showCommentDeleteOptions: true
    });
  },

  // 长按评论（在动态列表中）
  onCommentLongPress(e: any) {
    const commentId = e.currentTarget.dataset.commentid;
    const postId = e.currentTarget.dataset.postid;
    const currentOpenid = wx.getStorageSync('openid');
    
    console.log('长按评论（列表中）:', { commentId, postId, currentOpenid });
    
    // 检查用户是否已登录
    if (!currentOpenid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    // 查找对应的动态和评论
    const post = this.data.posts.find(p => p.id === postId);
    if (!post || !post.comments) {
      wx.showToast({
        title: '评论不存在',
        icon: 'none'
      });
      return;
    }
    
    const comment = post.comments.find(c => c.id === commentId);
    if (!comment) {
      wx.showToast({
        title: '评论不存在',
        icon: 'none'
      });
      return;
    }
    
    // 检查权限：只有评论的作者才能删除
    if (comment.openid !== currentOpenid) {
      return;
    }
    
    // 显示删除选项
    this.setData({
      selectedCommentId: commentId,
      showCommentDeleteOptions: true
    });
  },

  // 评论删除选项弹窗显示状态变化
  onCommentDeleteOptionsVisibleChange(e: any) {
    this.setData({
      showCommentDeleteOptions: e.detail.visible
    });
  },

  // 确认删除评论
  async confirmCommentDelete() {
    const { selectedCommentId } = this.data;
    const currentOpenid = wx.getStorageSync('openid');
    
    if (!selectedCommentId) {
      console.log('没有选中的评论ID');
      return;
    }
    
    if (!currentOpenid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    try {
      wx.showLoading({ title: '删除中...' });
      
      console.log('准备删除评论，commentId:', selectedCommentId);
      
      // 从云数据库软删除评论（设置deleted=true）
      await deleteComment(selectedCommentId);
      console.log('云数据库删除成功');
      
      // 验证删除是否成功
      setTimeout(async () => {
        try {
          const { selectedPostId } = this.data;
          const comments = await getComments(selectedPostId);
          console.log('验证删除结果，当前评论数量:', comments.length);
          console.log('当前评论列表:', comments);
        } catch (error) {
          console.error('验证删除结果失败:', error);
        }
      }, 1000);
      
      // 从本地数据中移除评论
      this.removeCommentFromLocal(selectedCommentId);
      console.log('本地数据删除成功');
      
      // 关闭弹窗
      this.setData({
        showCommentDeleteOptions: false,
        selectedCommentId: ''
      });
      
      wx.hideLoading();
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('删除评论失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '删除失败，请重试',
        icon: 'none'
      });
    }
  },

  // 取消删除评论
  cancelCommentDelete() {
    this.setData({
      showCommentDeleteOptions: false,
      selectedCommentId: ''
    });
  },

  // 从本地数据中移除评论
  removeCommentFromLocal(commentId: string) {
    // 更新当前弹窗中的评论列表
    const updatedCurrentComments = this.data.currentPostComments.filter(c => c.id !== commentId);
    this.setData({
      currentPostComments: updatedCurrentComments
    });
    
    // 更新所有动态中的评论数据
    const posts = this.data.posts.map(post => {
      if (post.comments) {
        const updatedComments = post.comments.filter(c => c.id !== commentId);
        return { ...post, comments: updatedComments };
      }
      return post;
    });
    
    const allPostsData = this.data.allPostsData.map(post => {
      if (post.comments) {
        const updatedComments = post.comments.filter(c => c.id !== commentId);
        return { ...post, comments: updatedComments };
      }
      return post;
    });
    
    this.setData({
      posts,
      allPostsData
    });
    
    // 保存到本地存储
    this.savePosts();
  },

  // 展开/收起评论
  onCommentExpandToggle(e: any) {
    const postId = e.currentTarget.dataset.postid;
    console.log('切换评论展开状态，postId:', postId);
    
    // 更新posts数据
    const posts = this.data.posts.map(post => {
      if (post.id === postId) {
        return { ...post, showAllComments: !post.showAllComments };
      }
      return post;
    });
    
    // 更新allPostsData数据
    const allPostsData = this.data.allPostsData.map(post => {
      if (post.id === postId) {
        return { ...post, showAllComments: !post.showAllComments };
      }
      return post;
    });
    
    this.setData({
      posts,
      allPostsData
    });
    
    // 保存到本地存储
    this.savePosts();
  },

  // 测试评论加载
  async testCommentLoading() {
    console.log('=== 开始测试评论加载 ===');
    
    // 等待一段时间让动态加载完成
    setTimeout(async () => {
      console.log('当前动态数据:', this.data.posts);
      
      if (this.data.posts.length > 0) {
        const firstPost = this.data.posts[0];
        console.log('测试第一个动态的评论加载:', firstPost.id);
        
        try {
          const comments = await getComments(firstPost.id);
          console.log('测试获取到的评论:', comments);
        } catch (error) {
          console.error('测试评论加载失败:', error);
        }
      } else {
        console.log('没有动态数据，无法测试评论加载');
      }
    }, 2000);
  },

  // 请求订阅消息授权
  async requestSubscribeMessage() {
    const templateId = 'Jg6qHMqCG24_bGVVPwtHjeBxQYB0urT0REeah9g7zfc';
    
    try {
      const result = await wx.requestSubscribeMessage({
        tmplIds: [templateId],
        success: (res) => {
          console.log('订阅消息授权结果:', res);
          if (res[templateId] === 'accept') {
            wx.showToast({
              title: '订阅成功',
              icon: 'success'
            });
          } else if (res[templateId] === 'reject') {
            wx.showToast({
              title: '已拒绝订阅',
              icon: 'none'
            });
          } else {
            wx.showToast({
              title: '订阅失败',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          console.error('订阅消息授权失败:', err);
          wx.showToast({
            title: '授权失败',
            icon: 'none'
          });
        }
      });
      
      return result;
    } catch (error) {
      console.error('请求订阅消息失败:', error);
      wx.showToast({
        title: '请求失败',
        icon: 'none'
      });
      throw error;
    }
  },

  // 发送订阅消息
  async sendSubscribeMessage(data: any) {
    const templateId = 'Jg6qHMqCG24_bGVVPwtHjeBxQYB0urT0REeah9g7zfc';
    
    try {
      if (!wx.cloud) {
        throw new Error('云开发未初始化');
      }
      
      const result = await wx.cloud.callFunction({
        name: 'sendSubscribeMessage',
        data: {
          templateId: templateId,
          data: data
        }
      });
      
      console.log('发送订阅消息结果:', result);
      
      if (result.result && typeof result.result === 'object' && result.result.success) {
        wx.showToast({
          title: '发送成功',
          icon: 'success'
        });
        return result.result;
      } else {
        const errorMsg = (result.result && typeof result.result === 'object' && result.result.error) 
          ? result.result.error 
          : '发送失败';
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('发送订阅消息失败:', error);
      wx.showToast({
        title: '发送失败',
        icon: 'none'
      });
      throw error;
    }
  }
});