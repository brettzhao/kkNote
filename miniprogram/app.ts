// app.ts
interface IAppOption {
  globalData: {
    stats?: {
      postsCount: number;
      imagesCount: number;
      textCount: number;
    };
  };
}

App<IAppOption>({
  globalData: {
    stats: {
      postsCount: 0,
      imagesCount: 0,
      textCount: 0
    }
  },

  onLaunch() {
    console.log('kkNote 小程序启动');
    this.initApp();
  },

  onShow() {
    console.log('kkNote 小程序显示');
  },

  onHide() {
    console.log('kkNote 小程序隐藏');
  },

  // 初始化应用
  initApp() {
    // 检查本地存储的动态数据
    this.loadPostsFromStorage();
  },

  // 从本地存储加载动态数据
  loadPostsFromStorage() {
    const posts = wx.getStorageSync('posts') || [];
    this.updateGlobalStats(posts);
  },

  // 更新全局统计数据
  updateGlobalStats(posts: any[]) {
    const stats = {
      postsCount: posts.length,
      imagesCount: posts.reduce((sum, post) => sum + (post.images?.length || 0), 0),
      textCount: posts.reduce((sum, post) => sum + (post.text?.trim() ? 1 : 0), 0)
    };
    this.globalData.stats = stats;
  }
});