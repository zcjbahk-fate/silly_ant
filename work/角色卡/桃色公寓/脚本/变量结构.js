const { z } = require('zod');

const schema = z.object({
  stat_data: z.object({
    时间: z.string().describe("当前游戏时间，例如：2025年6月1日 08:00"),
    地点: z.string().describe("当前所在的具体位置"),
    正在交互角色: z.string().describe("当前正在交互的女性角色，没有则保持为空"),
    房东状态: z.object({
      资金总额: z.number().describe("公寓运营资金总额，月底结算必须大于等于0，否则强制破产游戏结束"),
      地下室收藏品: z.array(z.string()).describe("存放在地下室收藏室里的女性物品、战利品或抵押物")
    }),
    房客状态: z.object({
      韦淑湛: z.object({
        已上交租金: z.number(),
        榨精小天才次数: z.number(),
        与黑人性交次数: z.number(),
        现在在做: z.string().describe("当前的行为或状态简述")
      }),
      李淑妮: z.object({
        已上交租金: z.number(),
        榨精小天才次数: z.number(),
        与黑人性交次数: z.number(),
        现在在做: z.string().describe("当前的行为或状态简述")
      }),
      黄婼琪: z.object({
        已上交租金: z.number(),
        榨精小天才次数: z.number(),
        与黑人性交次数: z.number(),
        现在在做: z.string().describe("当前的行为或状态简述")
      }),
      黄琳惠: z.object({
        已上交租金: z.number(),
        榨精小天才次数: z.number(),
        与黑人性交次数: z.number(),
        现在在做: z.string().describe("当前的行为或状态简述")
      }),
      曾粤梅: z.object({
        已上交租金: z.number(),
        榨精小天才次数: z.number(),
        与黑人性交次数: z.number(),
        现在在做: z.string().describe("当前的行为或状态简述")
      })
    })
  })
});

registerMvuSchema(schema);