# 定时推送订阅消息云函数

## 功能说明

这个云函数会定时从 `subscribe` 云数据库集合中读取订阅记录，并向每个订阅用户发送推送消息。

## 配置说明

### 定时触发器配置

**重要提示**：微信云开发的定时触发器最小间隔为 **1分钟**，无法设置为10秒。

即使配置文件中设置了10秒（`*/10 * * * * * *`），系统也会自动调整为最小间隔（1分钟）。

如果需要更频繁的推送（如10秒），可以考虑以下方案：

1. **使用云函数内部循环**（不推荐，会消耗大量资源）
2. **使用多个定时触发器**（每个间隔1分钟，错开时间）
3. **接受1分钟间隔的限制**（推荐）

### Cron 表达式说明

- `0 * * * * * *` - 每分钟的第0秒（当前配置）
- `0 */5 * * * *` - 每5分钟

## 数据库结构

### subscribe 集合

每条订阅记录应包含以下字段：

```javascript
{
  _id: "记录ID",
  openid: "用户openid",        // 必填
  templateId: "模板ID",       // 必填，模板ID
  userId: "用户ID",           // 必填，通常等于openid
  nickname: "用户昵称",        // 必填
  subscribeCount: 0,          // 必填，订阅次数
  thing1: "药品名称",         // 可选，推送时使用此字段，默认"药品"
  thing16: "提醒人",          // 可选，推送时使用此字段，默认用户昵称
  // 注意：time2 字段在推送时会自动使用发送时的当前时间，不需要在记录中存储
  page: "跳转页面",           // 可选，默认"pages/moment/moment"
  createTime: Date,
  updateTime: Date
}
```

### subDetail 集合

每条订阅详情记录应包含以下字段（用于配置推送内容）：

```javascript
{
  _id: "记录ID",
  templateId: "模板ID",       // 必填，模板ID
  thing1: "药品名称",         // 可选，推送时使用此字段，默认"药品"
  thing16: "提醒人",          // 可选，推送时使用此字段，默认"系统"
  createTime: Date,
  updateTime: Date
}
```

**说明：**
- 推送内容中的 `thing1` 和 `thing16` 从 `subDetail` 集合中根据 `templateId` 获取
- 如果 `subDetail` 集合中没有对应记录，则使用默认值

### pushRecord 集合

每条推送记录包含以下字段：

```javascript
{
  _id: "记录ID",
  openid: "用户openid",        // 必填
  templateId: "模板ID",       // 必填
  userId: "用户ID",           // 必填
  nickname: "用户昵称",        // 必填
  pushData: {},               // 推送数据
  success: true,              // 推送是否成功
  errCode: null,              // 错误码（失败时）
  errMsg: null,               // 错误信息（失败时）
  pushTime: Date,             // 推送时间
  createTime: Date            // 创建时间
}
```

## 部署步骤

1. 在微信开发者工具中，右键点击 `scheduledSubscribePush` 文件夹
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成
4. 定时触发器会自动生效

## 推送逻辑

1. 从 `subscribe` 集合读取所有订阅记录
2. 遍历每条记录，向对应的 `openid` 发送推送（所有存在订阅的用户都会收到推送）
3. 推送数据说明：
   - `thing1`（药物名称）：从 `subDetail` 集合中根据 `templateId` 获取 `thing1` 字段，如果不存在则使用默认值"药品"
   - `time2`（时间）：使用发送时的当前时间（格式：YYYY-MM-DD HH:mm:ss）
   - `thing16`（提醒人）：从 `subDetail` 集合中根据 `templateId` 获取 `thing16` 字段，如果不存在则使用用户昵称，再不存在则使用"系统"
4. 推送成功后，如果记录中存在 `subscribeCount` 字段，则减少订阅次数并更新 `subscribe` 集合
5. 如果订阅次数为0，自动删除该记录
6. 每次推送都会记录到 `pushRecord` 集合，包括成功和失败的情况
7. 返回推送统计结果

## 注意事项

1. **推送频率**：当前配置为每分钟执行一次（`0 * * * * * *`）
2. **订阅次数限制**：一次性订阅消息每次订阅只能发送一次
3. **定时触发器限制**：最小间隔为1分钟，无法设置为更短的时间
4. **推送内容**：
   - 时间字段（time2）始终使用发送时的当前时间
   - 药物名称（thing1）和提醒人（thing16）从 subscribe 表中读取
   - 如果 subscribe 表中没有这些字段，会使用默认值
5. **错误处理**：订阅次数用完的记录会自动删除
6. **环境配置**：`miniprogram_state` 需要根据实际环境设置（developer/trial/formal）

