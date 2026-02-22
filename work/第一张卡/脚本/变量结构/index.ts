// @ts-ignore
import { registerMvuSchema } from "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js";
// @ts-ignore
import { z } from "https://testingcf.jsdelivr.net/npm/zod/+esm";

declare const $: any;
declare const _: any;

// --- 辅助 Schema 定义 ---

// 1. 性经历通用逻辑（自动求和）
const SexExpSchema = z
  .object({
    口交: z.coerce.number().int().nonnegative().prefault(0),
    足交: z.coerce.number().int().nonnegative().prefault(0),
    插入: z.coerce.number().int().nonnegative().prefault(0),
    肛交: z.coerce.number().int().nonnegative().prefault(0),
    手交: z.coerce.number().int().nonnegative().prefault(0),
  })
  .transform((data: any) => {
    const total = (Object.values(data) as number[]).reduce(
      (sum, val) => sum + val,
      0,
    );
    return { ...data, 总数: total };
  });

// 2. 肉棒状态逻辑
const PenisSchema = z
  .object({
    当前长度: z.coerce.number().describe("单位cm，自动修正").prefault(5),
    长度范围: z.object({
      最小: z.coerce.number().int().prefault(5),
      最大: z.coerce.number().int().prefault(18),
    }),
    状态: z.string().prefault("未勃起"),
    描述: z.string().prefault("在内裤中蜷缩，包皮覆盖龟头"),
  })
  .transform((data: any) => {
    data.当前长度 = _.clamp(
      data.当前长度,
      data.长度范围.最小,
      data.长度范围.最大,
    );
    return data;
  });

// --- 主结构定义 ---
export const Schema = z.object({
  // 主角变量
  主角: z.object({
    年龄: z.coerce.number().int().prefault(24),

    性器状态: z.object({
      肉棒: PenisSchema,
    }),

    性经历: z.record(z.string().describe("女性角色名"), SexExpSchema).prefault({
      顾盼兮: {},
    }),
  }),

  // NPC变量
  角色: z
    .record(
      z.string().describe("角色名"),
      z.object({
        年龄: z.coerce.number().int().prefault(24),

        // 基础数值
        好感度: z.coerce
          .number()
          .transform((v: any) => _.clamp(v, 0, 100))
          .prefault(5),
        堕落度: z.coerce
          .number()
          .transform((v: any) => _.clamp(v, 0, 100))
          .prefault(5),
        性欲值: z.coerce
          .number()
          .transform((v: any) => _.clamp(v, 0, 100))
          .prefault(5),

        // --- 修改部分：支持多个 NTR 关系 ---
        // 使用 z.record，键名为"出轨对象/黄毛的名字"
        NTR关系: z.object({
          苦主姓名: z.string().prefault("托"), // 只需要定义一次苦主

          // 记录与各个黄毛的关系
          出轨对象: z
            .record(
              z.string().describe("黄毛名字"),
              z.object({
                NTR: z.coerce
                  .number()
                  .transform((v: any) => _.clamp(v, 0, 100))
                  .prefault(0),
              }),
            )
            .prefault({
              // 示例数据，不想要可以删掉
              王总: {
                NTR: 10,
              },
            }),
        }),

        当前姿势: z.string().prefault("站立，身体微倾"),

        体内精液: z
          .record(
            z.string().describe("来源人名"),
            z.object({
              量: z.coerce.number().nonnegative().prefault(0),
              状态: z.string().prefault("子宫深处 / 缓慢滴落 / 浓稠乳白色"),
            }),
          )
          .prefault({
            王总: { 量: 10, 状态: "子宫深处 / 缓慢滴落 / 浓稠乳白色" },
          }),

        上次做爱: z.object({
          时间: z.string().prefault("未知"),
          对象: z.string().prefault("无"),
          地点: z.string().prefault("未知"),
          方式: z.string().prefault("未知"),
        }),

        性经历: z.record(z.string().describe("对象名"), SexExpSchema).prefault({
          王总: { 口交: 1, 足交: 0, 插入: 1, 肛交: 0, 手交: 0 },
          前任: { 口交: 2, 足交: 0, 插入: 3, 肛交: 0, 手交: 0 },
        }),

        内心想法: z.string().prefault("..."),
        对主角看法: z.string().prefault("..."),
      }),
    )
    .prefault({}),
});

$(() => {
  registerMvuSchema(Schema);
});
