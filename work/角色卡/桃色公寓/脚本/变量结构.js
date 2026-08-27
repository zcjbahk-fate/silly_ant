import { registerMvuSchema } from "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js";

// 1. 女租客状态 Schema
const TenantSchema = z
  .object({
    已上交租金: z.coerce.number().prefault(0),
    榨精次数: z.coerce.number().prefault(0),
    与黑人性交次数: z.coerce.number().prefault(0),
    对user态度等级: z.coerce.number().prefault(5),
    媚黑暴露程度: z.coerce.number().prefault(0),
    处女状态: z.coerce.boolean().prefault(false),
    现在在做: z.string().prefault(""),
  })
  .prefault({})
  .transform((data) => {
    data.已上交租金 = Math.max(0, data.已上交租金 || 0);
    data.榨精次数 = Math.max(0, data.榨精次数 || 0);
    data.与黑人性交次数 = Math.max(0, data.与黑人性交次数 || 0);
    data.对user态度等级 = Math.min(10, Math.max(1, data.对user态度等级 || 5));
    data.媚黑暴露程度 = Math.min(100, Math.max(0, data.媚黑暴露程度 || 0));
    data.处女状态 = Boolean(data.处女状态);
    return data;
  });

// 2. 主 Schema 定义
export const Schema = z.object({
  时间: z.string().prefault("2025年6月1日 08:00"),
  地点: z.string().prefault("桃色公寓 四楼办公室"),
  正在交互角色: z.string().prefault(""),
  房东状态: z
    .object({
      资金总额: z.coerce.number().prefault(20000),
      地下室收藏品: z.array(z.string()).prefault([
        "前租客谭婷婷用来抵债的原味粉色内裤",
        "温知夏当生日礼物送给{{user}}的原味红底细跟高跟鞋",
      ]),
    })
    .prefault({}),
  房客状态: z
    .record(z.string().describe("女租客姓名"), TenantSchema)
    .prefault({}),
});

// 3. 注册到 MVU
$(() => {
  registerMvuSchema(Schema);
});
