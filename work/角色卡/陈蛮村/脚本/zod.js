import { registerMvuSchema } from "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js";

// 1. 性经历通用逻辑（自动计算总数）
const SexExpSchema = z
  .object({
    口交: z.coerce.number().int().prefault(0),
    足交: z.coerce.number().int().prefault(0),
    插入: z.coerce.number().int().prefault(0),
    肛交: z.coerce.number().int().prefault(0),
    手交: z.coerce.number().int().prefault(0),
  })
  .transform((data) => {
    // 强制修正负数
    data.口交 = Math.max(0, data.口交);
    data.足交 = Math.max(0, data.足交);
    data.插入 = Math.max(0, data.插入);
    data.肛交 = Math.max(0, data.肛交);
    data.手交 = Math.max(0, data.手交);
    const total = data.口交 + data.足交 + data.插入 + data.肛交 + data.手交;
    return { ...data, 总数: total };
  });

// 2. 苦主的绿帽档案逻辑
const NtrRecordSchema = z.object({
  NTR: z.coerce.number().prefault(0),
}).transform(data => {
  data.NTR = _.clamp(data.NTR, 0, 100);
  return data;
});

// --- 主结构定义 ---
export const Schema = z.object({
  系统: z.object({
    距离除夕还剩天数: z.coerce.number().prefault(7),
  }).transform(data => {
    data.距离除夕还剩天数 = _.clamp(data.距离除夕还剩天数, 0, 7);
    return data;
  }),

  // 主角变量
  主角: z.object({
    年龄: z.coerce.number().int().prefault(24),

    性器状态: z.object({
      肉棒: z.object({
        当前长度: z.coerce.number().prefault(0),
        状态: z.string().prefault("未勃起"),
        描述: z.string().prefault("无"),
      }),
    }),

    // 主角的配种记录
    性经历: z.record(z.string().describe("女性角色名"), SexExpSchema).prefault({}),
  }),

  // NPC变量
  角色: z
    .record(
      z.string().describe("角色名"),
      z.object({
        年龄: z.coerce.number().int().prefault(24),
        是否知晓村中习俗: z.string().prefault("未知"),

        // 这里只做基础定义，去掉单点的 transform
        好感度: z.coerce.number().prefault(0),
        堕落度: z.coerce.number().prefault(0),
        性欲值: z.coerce.number().prefault(0),

        NTR关系: z.object({
          苦主姓名: z.string().prefault("无"),
          出轨对象: z.record(z.string().describe("黄毛名字"), NtrRecordSchema).prefault({}),
        }),

        当前姿势: z.string().prefault("站立"),
        内心想法: z.string().prefault("无"),
        对主角看法: z.string().prefault("无"),

        体内精液: z
          .record(
            z.string().describe("来源人名"),
            z.object({
              量: z.coerce.number().prefault(0),
              状态: z.string().prefault("干净"),
            })
          )
          .prefault({}),

        上次做爱: z.object({
          时间: z.string().prefault("无"),
          对象: z.string().prefault("无"),
          地点: z.string().prefault("无"),
          方式: z.string().prefault("无"),
        }),

        性经历: z.record(z.string().describe("对象名"), SexExpSchema).prefault({}),
      })
      // 【重点】在这里对整个角色对象进行拦截修正
      .transform(data => {
        data.好感度 = _.clamp(data.好感度, 0, 100);
        data.堕落度 = _.clamp(data.堕落度, 0, 100);
        data.性欲值 = _.clamp(data.性欲值, 0, 100);

        // 顺便把精液量也做个负数拦截，以防万一
        if (data.体内精液) {
          Object.values(data.体内精液).forEach(semen => {
            semen.量 = Math.max(0, semen.量);
          });
        }
        return data;
      })
    )
    .prefault({}),
});

$(() => {
  registerMvuSchema(Schema);
});
