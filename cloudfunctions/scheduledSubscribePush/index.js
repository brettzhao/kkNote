// 云函数：定时发送订阅消息
// 从 subscribe 集合读取订阅记录并发送推送
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const templateId = 'Jg6qHMqCG24_bGVVPwtHjeBxQYB0urT0REeah9g7zfc';

exports.main = async (event, context) => {
  console.log('[定时推送] 开始执行定时推送任务');
  
  try {
    // 从 subscribe 集合读取指定 templateId 的所有订阅记录
    // 注意：微信云数据库 get() 方法默认最多返回 20 条记录，需要使用分页查询获取所有记录
    const subscribeCollection = db.collection('subscribe');
    const MAX_LIMIT = 100; // 每次最多查询 100 条
    let allSubscribes = [];
    let hasMore = true;
    let skip = 0;
    
    // 分页查询所有记录
    while (hasMore) {
      const result = await subscribeCollection.where({
        templateId: templateId
      }).skip(skip).limit(MAX_LIMIT).get();
      
      if (result.data.length > 0) {
        allSubscribes = allSubscribes.concat(result.data);
        console.log(`[定时推送] 分页查询: 已获取 ${allSubscribes.length} 条记录 (本次查询 ${result.data.length} 条)`);
        
        // 如果本次查询返回的记录数小于 MAX_LIMIT，说明已经查询完所有记录
        if (result.data.length < MAX_LIMIT) {
          hasMore = false;
        } else {
          skip += MAX_LIMIT;
        }
      } else {
        hasMore = false;
      }
    }
    
    console.log(`[定时推送] 查询到 ${allSubscribes.length} 条 templateId 为 ${templateId} 的订阅记录`);
    
    if (allSubscribes.length === 0) {
      console.log('[定时推送] 没有订阅记录，跳过推送');
      return {
        success: true,
        message: '没有订阅记录',
        count: 0
      };
    }
    
    // 统计推送结果
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    
    // 从 subDetail 集合获取对应 template 的数据（只查询一次，提高效率）
    let thing1Value = '药品';  // 默认值
    let thing16Value = '系统';  // 默认值
    
    try {
      const subDetailCollection = db.collection('subDetail');
      const subDetailResult = await subDetailCollection.where({
        templateId: templateId
      }).get();
      
      if (subDetailResult.data.length > 0) {
        const subDetail = subDetailResult.data[0];
        thing1Value = subDetail.thing1 || thing1Value;
        thing16Value = subDetail.thing16 || thing16Value;
        console.log(`[定时推送] 从 subDetail 集合获取数据成功: thing1=${thing1Value}, thing16=${thing16Value}`);
      } else {
        console.warn(`[定时推送] subDetail 集合中未找到 templateId 为 ${templateId} 的记录，将使用默认值`);
        console.warn(`[定时推送] 请检查 subDetail 集合中是否存在 templateId="${templateId}" 的记录`);
      }
    } catch (subDetailError) {
      console.error(`[定时推送] 从 subDetail 集合获取数据失败:`, subDetailError);
      console.warn(`[定时推送] 将使用默认值继续推送: thing1=${thing1Value}, thing16=${thing16Value}`);
      // 使用默认值继续推送
    }
    
    // 遍历每条订阅记录并发送推送（对所有订阅用户都发送推送）
    console.log(`[定时推送] 开始向 ${allSubscribes.length} 个订阅用户发送推送`);
    
    // 过滤出有订阅次数的用户（subscribeCount > 0）
    const validSubscribes = allSubscribes.filter(sub => {
      const hasOpenid = sub.openid && sub.openid.trim() !== '';
      const hasCount = sub.subscribeCount !== undefined && sub.subscribeCount !== null && sub.subscribeCount > 0;
      
      if (!hasOpenid) {
        console.warn(`[定时推送] 订阅记录 ${sub._id} 缺少 openid，跳过该记录`);
        return false;
      }
      
      if (!hasCount) {
        console.warn(`[定时推送] 订阅记录 ${sub._id} (openid=${sub.openid}) 订阅次数为0或未设置，跳过推送`);
        return false;
      }
      
      return true;
    });
    
    console.log(`[定时推送] 有效订阅用户数: ${validSubscribes.length} (总记录数: ${allSubscribes.length})`);
    
    // 输出所有用户的详细信息，便于调试
    console.log(`[定时推送] 所有订阅记录详情 (共 ${allSubscribes.length} 条):`);
    allSubscribes.forEach((sub, index) => {
      const hasOpenid = sub.openid && sub.openid.trim() !== '';
      const hasCount = sub.subscribeCount !== undefined && sub.subscribeCount !== null && sub.subscribeCount > 0;
      const isValid = hasOpenid && hasCount;
      console.log(`  [${index + 1}] openid=${sub.openid || '无'}, nickname=${sub.nickname || '未知'}, subscribeCount=${sub.subscribeCount !== undefined ? sub.subscribeCount : '未设置'}, templateId=${sub.templateId || '无'}, 有效=${isValid ? '是' : '否'}`);
    });
    
    if (validSubscribes.length === 0) {
      console.warn('[定时推送] 没有有效的订阅用户（所有用户的订阅次数都为0或未设置），跳过推送');
      return {
        success: true,
        message: '没有有效的订阅用户',
        total: allSubscribes.length,
        validCount: 0,
        count: 0
      };
    }
    
    console.log(`[定时推送] 开始向 ${validSubscribes.length} 个有效用户发送推送`);
    
    // 记录所有有效用户的 openid，便于调试
    const validOpenids = validSubscribes.map(sub => sub.openid);
    console.log(`[定时推送] 有效用户 openid 列表: ${validOpenids.join(', ')}`);
    
    let processedCount = 0;
    for (const subscribe of validSubscribes) {
      processedCount++;
      try {
        const openid = subscribe.openid;
        
        // 记录用户信息
        console.log(`[定时推送] [${processedCount}/${validSubscribes.length}] 处理用户: openid=${openid}, nickname=${subscribe.nickname || '未知'}, subscribeCount=${subscribe.subscribeCount}`);
        
        // 使用从 subDetail 获取的值，如果没有则使用用户昵称作为 thing16 的备选
        const finalThing16 = thing16Value === '系统' ? (subscribe.nickname || '系统') : thing16Value;
        
        // 准备推送数据
        // 从 subDetail 集合获取数据，时间使用当前北京时间（UTC+8）
        const currentTime = formatDateTime(getBeijingTime());
        const pushData = {
          thing1: { value: thing1Value },  // 从 subDetail 集合获取
          time2: { value: currentTime },  // 使用发送时的当前时间
          thing16: { value: finalThing16 }  // 从 subDetail 集合获取，如果没有则使用用户昵称
        };
        
        console.log(`[定时推送] 准备向 ${openid} (${subscribe.nickname || '用户'}) 发送推送`);
        console.log(`[定时推送] 推送数据: thing1="${thing1Value}", thing16="${finalThing16}", time2="${currentTime}"`);
        
        // 发送订阅消息
        const sendResult = await cloud.openapi.subscribeMessage.send({
          touser: openid,
          template_id: templateId,
          page: subscribe.page || 'pages/moment/moment',
          data: pushData,
          miniprogram_state: 'developer' // 开发版使用 developer，正式版改为 formal
        });
        
        // 记录推送信息到 pushRecord 集合
        try {
          const pushRecord = db.collection('pushRecord');
          await pushRecord.add({
            data: {
              openid: openid,
              templateId: templateId,
              userId: subscribe.userId || openid,
              nickname: subscribe.nickname || '用户',
              pushData: pushData,
              success: sendResult.errCode === 0,
              errCode: sendResult.errCode || null,
              errMsg: sendResult.errMsg || null,
              pushTime: new Date(),
              createTime: new Date()
            }
          });
          console.log(`[定时推送] 推送记录已保存到 pushRecord: ${openid}`);
        } catch (recordError) {
          console.error(`[定时推送] 记录推送信息失败:`, recordError);
          // 记录失败不影响推送流程
        }
        
        if (sendResult.errCode === 0) {
          console.log(`[定时推送] [${processedCount}/${validSubscribes.length}] 推送成功: ${openid}`);
          successCount++;
          
          // 推送成功，减少订阅次数（如果存在订阅次数字段）
          if (subscribe.subscribeCount !== undefined && subscribe.subscribeCount !== null) {
            const newCount = Math.max(0, (subscribe.subscribeCount || 0) - 1);
            try {
              await subscribeCollection.doc(subscribe._id).update({
                data: {
                  subscribeCount: newCount,
                  updateTime: new Date()
                }
              });
              console.log(`[定时推送] 订阅次数已更新: ${openid}, 剩余: ${newCount}`);
              
              // 如果次数为0，可以考虑删除记录（可选）
              if (newCount <= 0) {
                console.log(`[定时推送] 订阅次数已用完，删除记录: ${openid}`);
                try {
                  await subscribeCollection.doc(subscribe._id).remove();
                } catch (deleteError) {
                  console.error(`[定时推送] 删除记录失败:`, deleteError);
                }
              }
            } catch (updateError) {
              console.error(`[定时推送] 更新订阅次数失败:`, updateError);
            }
          }
        } else {
          // 推送失败
          console.error(`[定时推送] [${processedCount}/${validSubscribes.length}] 推送失败: ${openid}, 错误码: ${sendResult.errCode}, 错误信息: ${sendResult.errMsg}`);
          failCount++;
          errors.push({
            openid: openid,
            errCode: sendResult.errCode,
            errMsg: sendResult.errMsg
          });
          
          // 错误码说明：
          // 43101: 用户拒绝接受消息（通常是订阅次数用完，一次性订阅消息每次订阅只能发送一次）
          // 47003: 模板参数不正确
          // 40001: 无效的access_token
          // 40003: 无效的openid
          // 40037: 无效的模板id
          
          if (sendResult.errCode === 43101) {
            console.warn(`[定时推送] 用户 ${openid} 订阅次数已用完（错误码43101），减少订阅次数`);
            // 如果是订阅次数用完的错误（43101），减少订阅次数（如果存在订阅次数字段）
            if (subscribe.subscribeCount !== undefined && subscribe.subscribeCount !== null) {
              const newCount = Math.max(0, (subscribe.subscribeCount || 0) - 1);
              try {
                await subscribeCollection.doc(subscribe._id).update({
                  data: {
                    subscribeCount: newCount,
                    updateTime: new Date()
                  }
                });
                console.log(`[定时推送] 订阅次数已更新: ${openid}, 剩余: ${newCount}`);
                
                // 如果次数为0，删除记录
                if (newCount <= 0) {
                  console.log(`[定时推送] 订阅次数已用完，删除记录: ${openid}`);
                  try {
                    await subscribeCollection.doc(subscribe._id).remove();
                  } catch (deleteError) {
                    console.error(`[定时推送] 删除记录失败:`, deleteError);
                  }
                }
              } catch (updateError) {
                console.error(`[定时推送] 更新订阅次数失败:`, updateError);
              }
            }
          } else {
            console.warn(`[定时推送] 用户 ${openid} 推送失败，但保留订阅次数，错误码: ${sendResult.errCode}`);
            // 其他错误（如网络问题、模板参数错误等），不减少订阅次数，下次继续尝试
          }
        }
      } catch (error) {
        console.error(`[定时推送] [${processedCount}/${validSubscribes.length}] 处理订阅记录 ${subscribe._id} 时出错:`, error);
        failCount++;
        errors.push({
          openid: subscribe.openid,
          error: error.message
        });
      }
      
      // 记录处理进度
      if (processedCount % 10 === 0 || processedCount === validSubscribes.length) {
        console.log(`[定时推送] 处理进度: ${processedCount}/${validSubscribes.length} (成功: ${successCount}, 失败: ${failCount})`);
      }
    }
    
    console.log(`[定时推送] 推送完成，总处理: ${processedCount}/${validSubscribes.length}, 成功: ${successCount}, 失败: ${failCount}`);
    
    return {
      success: true,
      total: allSubscribes.length,
      validCount: validSubscribes.length,
      successCount: successCount,
      failCount: failCount,
      errors: errors
    };
    
  } catch (error) {
    console.error('[定时推送] 执行失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 获取北京时间（UTC+8）
function getBeijingTime() {
  const now = new Date();
  // 获取 UTC 时间戳（毫秒）
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  // 加上 8 小时（北京时间 UTC+8）
  const beijingTime = new Date(utcTime + (8 * 60 * 60 * 1000));
  return beijingTime;
}

// 格式化日期时间
function formatDateTime(date) {
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

