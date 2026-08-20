import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';

export const Schema = z.object({
  手机消息: z.record(
    z.string().describe('消息标题'),
    z.string().describe('消息内容')
  ).transform(data => {
    // 限制最多3条消息
    return _(data).entries().takeRight(3).fromPairs().value();
  }).catch({}).prefault({}),

  坐标: z.object({
    时间: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
    当前位置: z.object({
      区域: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
      具体设施: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化')
    }).catch({}).prefault({})
  }).catch({}).prefault({}),

  主角: z.object({
    姓名: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
    年龄: z.coerce.number().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
    现金: z.coerce.number().catch(0).prefault(0),
    黑市信誉: z.coerce.number().transform(v => _.clamp(v, 0, 100)).catch(0).prefault(0),
    限量库存: z.object({
      S病毒: z.coerce.number().transform(v => Math.max(v, 0)).catch(0).prefault(0),
      智械组件: z.coerce.number().transform(v => Math.max(v, 0)).catch(0).prefault(0),
      灵异注入材料: z.coerce.number().transform(v => Math.max(v, 0)).catch(0).prefault(0)
    }).catch({}).prefault({})
  }).catch({}).prefault({}),

  装备: z.record(
    z.string().describe('装备名'),
    z.object({
      描述: z.string(),
      数量: z.coerce.number()
    })
  ).transform(data => _.pickBy(data, ({ 数量 }) => 数量 > 0)).catch({}).prefault({}),

  在场角色列表: z.record(
    z.string().describe('实体标识名'),
    z.boolean()
  ).catch({}).prefault({}),

  角色列表: z.record(
    z.string().describe('角色姓名'),
    z.intersection(
      z.object({
        年龄: z.union([z.number(), z.string()]).or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
        性别: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
        生命阶段: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
        当前位置: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
        背景身份: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
        当前身份: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
        发色: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
        发型: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
        瞳色: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
        服装: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
        容貌: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
        身高: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
        身材: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
        罩杯: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
        性格: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
        种族: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
        经历: z.object({
          过往: z.record(z.string().describe('时段'), z.any().catch('数据异常')).catch({}).prefault({}),
          初见: z.record(z.string().describe('时段'), z.any().catch('数据异常')).catch({}).prefault({}),
          新历: z.record(z.string().describe('时段'), z.any().catch('数据异常')).catch({}).prefault({})
        }).catch({}).prefault({}),
        名器特点: z.string().or(z.literal('待初始化')).catch('待初始化').prefault('待初始化'),
        性交经历: z.record(z.string().describe('经历时间'), z.any().catch('数据异常')).catch({}).prefault({}),
        孕期: z.object({
          过往怀孕经历: z.record(z.string().describe('时段'), z.any().catch('数据异常')).catch({}).prefault({}),
          当前孕期: z.string().or(z.literal('无')).catch('无').prefault('无')
        }).catch({}).prefault({}),
        部位: z.object({
          血管填充: z.string().or(z.literal('无')).catch('无').prefault('无'),
          内脏: z.string().or(z.literal('无')).catch('无').prefault('无'),
          骨骼: z.string().or(z.literal('无')).catch('无').prefault('无'),
          肌肉: z.string().or(z.literal('无')).catch('无').prefault('无'),
          皮肤: z.string().or(z.literal('无')).catch('无').prefault('无'),
          气味: z.string().or(z.literal('无')).catch('无').prefault('无'),
          声带: z.string().or(z.literal('无')).catch('无').prefault('无'),
          脑部: z.string().or(z.literal('无')).catch('无').prefault('无'),
          颈部: z.string().or(z.literal('无')).catch('无').prefault('无'),
          眼部: z.string().or(z.literal('无')).catch('无').prefault('无'),
          口部: z.string().or(z.literal('无')).catch('无').prefault('无'),
          胸部: z.string().or(z.literal('无')).catch('无').prefault('无'),
          小穴: z.string().or(z.literal('无')).catch('无').prefault('无'),
          淫纹: z.string().or(z.literal('无')).catch('无').prefault('无'),
          宫颈: z.string().or(z.literal('无')).catch('无').prefault('无'),
          后庭: z.string().or(z.literal('无')).catch('无').prefault('无'),
          四肢: z.string().or(z.literal('无')).catch('无').prefault('无'),
          伤口: z.string().or(z.literal('无')).catch('无').prefault('无'),
          整体: z.string().or(z.literal('无')).catch('无').prefault('无'),
          外观: z.string().or(z.literal('无')).catch('无').prefault('无'),
          限量改造: z.string().or(z.literal('无')).catch('无').prefault('无')
        }).catch({}).prefault({})
      }),
      z.record(z.string(), z.any().catch('异常数据'))
    ).catch({}).prefault({})
  ).catch({}).prefault({})
});

$(() => {
  registerMvuSchema(Schema);
})
