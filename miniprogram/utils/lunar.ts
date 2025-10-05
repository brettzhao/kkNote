// 农历工具类 - 使用js-calendar-converter库
let calendar: any = null;

// 尝试加载js-calendar-converter库
try {
  calendar = require('js-calendar-converter');
  console.log('js-calendar-converter库加载成功');
} catch (error) {
  console.error('js-calendar-converter库加载失败:', error);
  console.log('请确保已执行"构建npm"操作');
}

// 获取今天的农历日期
export const getTodayLunarDate = (): string => {
  try {
    // 检查库是否加载成功
    if (!calendar || typeof calendar.solar2lunar !== 'function') {
      console.error('js-calendar-converter库未正确加载');
      throw new Error('js-calendar-converter库未正确加载，请执行"构建npm"操作');
    }

    const date = new Date();
    const lunarDate = calendar.solar2lunar(date.getFullYear(), date.getMonth() + 1, date.getDate());
    
    console.log('农历日期信息:', lunarDate);
    
    // 使用库返回的农历月份和日期名称
    const lunarDateStr = `${lunarDate.IMonthCn}${lunarDate.IDayCn}`;
    console.log('农历日期:', lunarDateStr);
    
    return lunarDateStr;
  } catch (error) {
    console.error('获取农历日期失败:', error);
    throw new Error('农历日期获取失败');
  }
};

// 获取农历详细信息
export const getLunarInfo = () => {
  try {
    // 检查库是否加载成功
    if (!calendar || typeof calendar.solar2lunar !== 'function') {
      console.error('js-calendar-converter库未正确加载');
      throw new Error('js-calendar-converter库未正确加载，请执行"构建npm"操作');
    }

    const date = new Date();
    const lunarDate = calendar.solar2lunar(date.getFullYear(), date.getMonth() + 1, date.getDate());
    
    console.log('完整农历信息:', lunarDate);
    
    return {
      year: lunarDate.lYear,
      month: lunarDate.lMonth,
      day: lunarDate.lDay,
      isLeap: lunarDate.isLeap,
      zodiac: lunarDate.Animal,
      term: lunarDate.Term,
      display: `${lunarDate.IMonthCn}${lunarDate.IDayCn}`,
      ganZhiYear: lunarDate.gzYear,
      ganZhiMonth: lunarDate.gzMonth,
      ganZhiDay: lunarDate.gzDay,
      astro: lunarDate.astro,
      isTerm: lunarDate.isTerm
    };
  } catch (error) {
    console.error('获取农历信息失败:', error);
    throw new Error('农历信息获取失败');
  }
};