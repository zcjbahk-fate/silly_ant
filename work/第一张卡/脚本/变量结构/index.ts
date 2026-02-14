import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
// --- 辅助函数：日期计算 ---
// 用于将 "YYYY-MM-DD HH:MM" 格式的时间增加指定分钟数
function addMinutesToDate(dateStr: string, minutes: number) {
  try {
    // 简单解析：兼容 'YYYY-MM-DD HH:MM' 格式
    const date = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(date.getTime())) return "无效时间";

    // 增加分钟数
    date.setMinutes(date.getMinutes() + minutes);

    // 格式化回字符串
    const pad = (n: number) => n.toString().padStart(2, '0');
    const YYYY = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const DD = pad(date.getDate());
    const HH = pad(date.getHours());
    const mm = pad(date.getMinutes());

    return `${YYYY}-${MM}-${DD} ${HH}:${mm}`;
  } catch (e) {
    return dateStr;
  }
}

// --- 基础模块定义 ---

// 1. 衣物/装备通用结构
const ClothingSchema = z.object({
  名称: z.string().prefault('默认衣物'),
  状态: z.string().prefault('未脱')
});

// 2. 性经历通用逻辑（自动求和）
const SexExpSchema = z.object({
  口交: z.coerce.number().int().nonnegative().prefault(0),
  足交: z.coerce.number().int().nonnegative().prefault(0),
  插入: z.coerce.number().int().nonnegative().prefault(0),
  肛交: z.coerce.number().int().nonnegative().prefault(0),
  手交: z.coerce.number().int().nonnegative().prefault(0),
}).transform(data => {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  return { ...data, 总数: total };
});

// 3. 肉棒状态逻辑（带范围自动修正）
const PenisSchema = z.object({
  当前长度: z.coerce.number().describe('单位cm，自动修正').prefault(5),
  长度范围: z.object({
    最小: z.coerce.number().int().prefault(5),
    最大: z.coerce.number().int().prefault(18)
  }),
  状态: z.string().prefault('未勃起'),
  描述: z.string().prefault('在内裤中蜷缩，包皮覆盖龟头')
}).transform(data => {
  data.当前长度 = _.clamp(data.当前长度, data.长度范围.最小, data.长度范围.最大);
  return data;
});

// 4. 系统环境逻辑（【修改重点】：时间段自动计算）
const SystemSchema = z.object({
  时间段: z.object({
    头: z.string()
      .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, "格式需为 YYYY-MM-DD HH:MM")
      .prefault('1999-01-03 13:00')
      .describe('开始时间'),
    经过时间: z.coerce.number().int().nonnegative()
      .prefault(0)
      .describe('单位：分钟'),
    // 尾由 transform 自动计算，不需要输入
  }).transform(data => {
    // 【逻辑】头 + 经过时间 = 尾
    const endTime = addMinutesToDate(data.头, data.经过时间);
    return { ...data, 尾: endTime };
  }),

  地点: z.string().prefault('别墅二层阁楼'),
  天气: z.enum(["晴天", "下雨", "多云", "下雪", "阴天"]).prefault('下雨'),
});

// --- 主结构定义 ---

export const Schema = z.object({
  // 系统变量
  系统: SystemSchema,

  // 主角变量
  主角: z.object({
    年龄: z.coerce.number().int().prefault(24),

    性器状态: z.object({
      肉棒: PenisSchema,
    }),

    持有重要物品: z
      .record(
        z.string().describe('物品名'),
        z.object({
          数量: z.coerce.number().int().nonnegative().prefault(1),
          效果: z.string().prefault('无特殊效果'),
        }),
      )
      .prefault({
        手机: { 数量: 1, 效果: '通讯工具' },
        银行卡: { 数量: 1, 效果: '支付工具' },
      }),

    技能: z.record(z.string(), z.string()).prefault({ 闪现: '能穿梭到指定位置' }),

    性经历: z.record(z.string().describe('女性角色名'), SexExpSchema).prefault({
      顾盼兮: { 口交: 0, 足交: 0, 插入: 0, 肛交: 0, 手交: 0 },
    }),

    对角色已知: z.record(z.string(), z.string()).prefault({ 顾盼兮: 'xx / xx' }),
    对角色未知: z.record(z.string(), z.string()).prefault({ 顾盼兮: 'xx / xx' }),
  }),

  // NPC变量
  角色: z
    .record(
      z.string().describe('角色名'),
      z.object({
        年龄: z.coerce.number().int().prefault(24),
        好感度: z.coerce.number().int().min(0).max(100).catch(5).prefault(5),
        堕落度: z.coerce.number().int().min(0).max(100).catch(5).prefault(5),
        性欲值: z.coerce.number().int().min(0).max(100).catch(5).prefault(5),

        上身: ClothingSchema.prefault({ 名称: '蓝色收腰西装外套', 状态: '未脱' }),
        下身: ClothingSchema.prefault({ 名称: '黑色职业包臀短裙', 状态: '未脱' }),
        腿部: ClothingSchema.prefault({ 名称: '15D肉色连裤丝袜', 状态: '半脱' }),
        鞋子: ClothingSchema.prefault({ 名称: '黑色圆头漆皮中跟鞋', 状态: '左边鞋子已脱' }),
        配饰: z.object({
          名称: z.string().describe('多件用 / 分隔').prefault('黑色蕾丝手套 / 银色细项链'),
          状态: z.string().describe('对应状态用 / 分隔').prefault('未脱 / 未脱'),
        }),

        特殊: z.string().prefault('红色指甲油 / 臀部蝴蝶纹身'),

        NTR关系: z.object({
          NTR对象: z.string().prefault('<user>'),
          出轨对象: z.string().prefault('王总'),
          数值: z.coerce.number().min(0).max(100).catch(5).prefault(5),
        }),

        当前姿势: z.string().prefault('站立，身体微倾靠向王总'),

        体内精液: z
          .record(
            z.string().describe('来源人名'),
            z.object({
              量: z.coerce.number().nonnegative().prefault(0),
              状态: z.string().describe('包含位置/流动/呈色').prefault('子宫深处 / 缓慢滴落 / 浓稠乳白色'),
            }),
          )
          .prefault({
            王总: { 量: 10, 状态: '子宫深处 / 缓慢滴落 / 浓稠乳白色' },
          }),

        上次做爱: z.object({
          时间: z.string().prefault('3天前'),
          对象: z.string().prefault('王总'),
          地点: z.string().prefault('办公室'),
          方式: z.string().prefault('内射'),
        }),

        性经历: z.record(z.string().describe('对象名'), SexExpSchema).prefault({
          王总: { 口交: 1, 足交: 0, 插入: 1, 肛交: 0, 手交: 0 },
          前任: { 口交: 2, 足交: 0, 插入: 3, 肛交: 0, 手交: 0 },
        }),

        内心想法: z.string().prefault('那个穷小子真是浪费时间...'),
        对主角看法: z.string().prefault('一个没钱还想装样子的屌丝...'),
        对主角已知: z.string().prefault('有钱 / 身体有缺陷'),
        对主角未知: z.string().prefault('主角的真实身份 / 主角的真实目的'),
      }),
    )
    .prefault({}),
});

$(() => {
  registerMvuSchema(Schema);
})
