/**
 * 个人空间模块 Mock 数据（纯数据层，与视图解耦）
 *
 * 说明：
 * - AI应用 / 工作流 Tab 暂未对接后端，使用本文件数据演示
 * - 插件 Tab 走 services/personalSpaceService 真实接口
 * - 知识库 Tab 走 services/dataset 真实接口
 * - 后端接口就绪后，删除对应 Mock 并在 space/index.vue 切换为 service 调用即可
 */
import type { AppCard, WorkflowCard } from '@/models/personalSpace'

/** 生成占位图 URL（Mock 专用） */
const IMG = (prompt: string): string =>
  `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=square`

/** Mock 默认所有者 */
const DEFAULT_OWNER = { name: '罐头', avatar: '' }

/** Tab 1：AI应用 Mock 列表 */
export const MOCK_APPS: AppCard[] = [
  {
    id: 'a1', icon: IMG('customer service avatar robot portrait chinese ecommerce'), name: '电商智能客服',
    verified: true, modelInfo: '月之暗面 · Moonshot (128K)',
    description:
      '## 任务 您的主要使命是通过 "DALL·E" 工具赋能用户，激发他们的创造力。通过询问 "你希望传递什么信息？" 或 "这个设计最是为了什么场合？" 等问题，引导用户分享他们想要创造的设计的核心。不要询问过多细节。',
    owner: DEFAULT_OWNER, lastEditTime: '05-15 16:05',
  },
  {
    id: 'a2', icon: IMG('blue cyan abstract tech robot helper delivery'), name: '快递小助手',
    verified: false, modelInfo: 'OpenAI · gpt-3-turbo-16k',
    description: '一个能帮你查询快递信息的小助手',
    owner: DEFAULT_OWNER, lastEditTime: '05-03 11:21',
  },
  {
    id: 'a3', icon: IMG('travel world map vacation flight ticket'), name: '旅游规划助手',
    verified: false, modelInfo: 'OpenAI · gpt-4o',
    description:
      '## 角色：旅行顾问 ### 技能： - 精通使用工具提供有关当地条件、住宿等的全面信息。 - 能够使用表情符号使对话更加引人入胜。 - 精通使用Markdown语法生成结构化文本。 - 精通使用Markdown语法显示图片...',
    owner: DEFAULT_OWNER, lastEditTime: '05-20 10:14',
  },
  {
    id: 'a4', icon: IMG('emoji translator keyboard cute icons'), name: 'Emoji翻译器',
    verified: false, modelInfo: 'OpenAI · gpt-3-turbo-16k',
    description:
      '我是一个 😀🍎🐶 表情符号（emoji）翻译机器人，我会把你发过来的语句用表情符号翻译给你。也可以翻译你发过来的表情符号，以及玩表情符号猜题游戏。',
    owner: DEFAULT_OWNER, lastEditTime: '05-15 16:05',
  },
  {
    id: 'a5', icon: IMG('software engineering prompt terminal code'), name: '提示工程猫',
    verified: false, modelInfo: 'OpenAI · gpt-3-turbo-16k',
    description:
      '零门槛搭建bot！最懂LLMOps的工程猫！输入你的创意，自动生成好用的提示词，并提供各类功能建议。',
    owner: DEFAULT_OWNER, lastEditTime: '05-03 11:21',
  },
  {
    id: 'a6', icon: IMG('college university exam study book'), name: '高考专业指南',
    verified: false, modelInfo: 'OpenAI · gpt-4o',
    description:
      '亲爱的考生，让我们通过十道有趣的问题，探索你的兴趣和潜力，找出最适合你的专业。我会告诉你这些专业的优秀高校在哪里，以及你未来的就业前景。让我来陪你走过这个重要的选择，打开你未来的新篇章吧！……',
    owner: DEFAULT_OWNER, lastEditTime: '05-20 10:14',
  },
  {
    id: 'a7', icon: IMG('xiaohongshu social media red notebook copywriter'), name: '小红书文案输出大师',
    verified: false, modelInfo: '月之暗面 · Moonshot (128K)',
    description: '专注于小红书爆款创造！',
    owner: DEFAULT_OWNER, lastEditTime: '05-15 16:05',
  },
  {
    id: 'a8', icon: IMG('ai code programming engineer terminal'), name: 'AI编程助手',
    verified: true, modelInfo: '阿里 · 通义千问Max',
    description:
      '采用最智能的大模型，自动化AI编程。精通Java、C、C++、Python、Rust、Go等编程语言有很深的造诣，能够回答各种复杂的与编程相关的问题。',
    owner: DEFAULT_OWNER, lastEditTime: '05-15 16:05',
  },
  {
    id: 'a9', icon: IMG('painter artist brush palette color oil painting'), name: '小画匠',
    verified: false, modelInfo: '月之暗面 · Moonshot (128K)',
    description:
      '一个能根据文字生成图片的机器人！支持风格，光线，材质，渲染，色彩，构图，视角等调教，以逗号分割即可，例如：中国风风格的花鸟矢量插图，圆形，浅蓝色背景。支持的风格有：中国画，油画，点彩画...',
    owner: DEFAULT_OWNER, lastEditTime: '05-15 16:05',
  },
  {
    id: 'a10', icon: IMG('blue cyan abstract tech robot helper delivery'), name: '快递小助手',
    verified: false, modelInfo: 'OpenAI · gpt-3-turbo-16k',
    description: '一个能帮你查询快递信息的小助手',
    owner: DEFAULT_OWNER, lastEditTime: '05-03 11:21',
  },
  {
    id: 'a11', icon: IMG('travel world map vacation flight ticket'), name: '旅游规划助手',
    verified: false, modelInfo: 'OpenAI · gpt-4o',
    description:
      '## 角色：旅行顾问 ### 技能： - 精通使用工具提供有关当地条件、住宿等的全面信息。 - 能够使用表情符号使对话更加引人入胜。 - 精通使用Markdown语法生成结构化文本。 - 精通使用Markdown语法显示图片...',
    owner: DEFAULT_OWNER, lastEditTime: '05-20 10:14',
  },
  {
    id: 'a12', icon: IMG('customer service avatar robot portrait chinese ecommerce'), name: '电商智能客服',
    verified: true, modelInfo: '月之暗面 · Moonshot (128K)',
    description:
      '## 任务 您的主要使命是通过 "DALL·E" 工具赋能用户，激发他们的创造力。通过询问 "你希望传递什么信息？" 或 "这个设计是为了什么场合？" 等问题，引导用户分享他们想要创造的设计的核心。不要询问...',
    owner: DEFAULT_OWNER, lastEditTime: '05-15 16:05',
  },
]

/** Tab 3：工作流 Mock 列表 */
export const MOCK_WORKFLOWS: WorkflowCard[] = [
  {
    id: 'w1', icon: IMG('xiaohongshu social media red notebook copywriter'), name: '小红书文案生成',
    verified: true, workflowName: 'WorkflowName', nodeCount: 15,
    description: '这是一个可以根据特定主体生成小红书文案传递对应的query即可。',
    owner: DEFAULT_OWNER, lastEditTime: '05-15 16:05',
  },
  {
    id: 'w2', icon: IMG('blue cyan abstract tech robot helper delivery'), name: '快递小助手',
    verified: false, workflowName: 'WorkflowName', nodeCount: 15,
    description: '一个能帮你查询快递信息的小助手',
    owner: DEFAULT_OWNER, lastEditTime: '05-03 11:21',
  },
  {
    id: 'w3', icon: IMG('travel world map vacation flight ticket'), name: '旅游规划助手',
    verified: false, workflowName: 'WorkflowName', nodeCount: 15,
    description:
      '## 角色：旅行顾问 ### 技能： - 精通使用工具提供有关当地条件、住宿等的全面信息。 - 能够使用表情符号使对话更加引人入胜。 - 精通使用Markdown语法生成结构化文本。 - 精通使用Markdown语法显示图片...',
    owner: DEFAULT_OWNER, lastEditTime: '05-20 10:14',
  },
  {
    id: 'w4', icon: IMG('emoji translator keyboard cute icons'), name: 'Emoji翻译器',
    verified: false, workflowName: 'WorkflowName', nodeCount: 15,
    description:
      '我是一个 😀🍎🐶 表情符号（emoji）翻译机器人，我会把你发过来的语句用表情符号翻译给你。也可以翻译你发过来的表情符号，以及玩表情符号猜题游戏。',
    owner: DEFAULT_OWNER, lastEditTime: '05-15 16:05',
  },
  {
    id: 'w5', icon: IMG('software engineering prompt terminal code'), name: '提示工程猫',
    verified: false, workflowName: 'WorkflowName', nodeCount: 15,
    description:
      '零门槛搭建bot！最懂LLMOps的工程猫！输入你的创意，自动生成好用的提示词，并提供各类功能建议。',
    owner: DEFAULT_OWNER, lastEditTime: '05-03 11:21',
  },
  {
    id: 'w6', icon: IMG('college university exam study book'), name: '高考专业指南',
    verified: false, workflowName: 'WorkflowName', nodeCount: 15,
    description:
      '亲爱的考生，让我们通过十道有趣的问题，探索你的兴趣和潜力，找出最适合你的专业。我会告诉你这些专业的优秀高校在哪里，以及你未来的就业前景。让我来陪你走过这个重要的选择，打开你未来的新篇章吧！……',
    owner: DEFAULT_OWNER, lastEditTime: '05-20 10:14',
  },
  {
    id: 'w7', icon: IMG('xiaohongshu social media red notebook copywriter'), name: '小红书文案输出大师',
    verified: false, workflowName: 'WorkflowName', nodeCount: 15,
    description: '专注于小红书爆款创造！',
    owner: DEFAULT_OWNER, lastEditTime: '05-15 16:05',
  },
  {
    id: 'w8', icon: IMG('ai code programming engineer terminal'), name: 'AI编程助手',
    verified: true, workflowName: 'WorkflowName', nodeCount: 15,
    description:
      '采用最智能的大模型，自动化AI编程。精通Java、C、C++、Python、Rust、Go等编程语言有很深的造诣，能够回答各种复杂的与编程相关的问题。',
    owner: DEFAULT_OWNER, lastEditTime: '05-15 16:05',
  },
  {
    id: 'w9', icon: IMG('painter artist brush palette color oil painting'), name: '小画匠',
    verified: false, workflowName: 'WorkflowName', nodeCount: 15,
    description:
      '一个能根据文字生成图片的机器人！支持风格，光线，材质，渲染，色彩，构图，视角等调教，以逗号分割即可，例如：中国风风格的花鸟矢量插图，圆形，浅蓝色背景。支持的风格有：中国画，油画，点彩画...',
    owner: DEFAULT_OWNER, lastEditTime: '05-15 16:05',
  },
  {
    id: 'w10', icon: IMG('blue cyan abstract tech robot helper delivery'), name: '快递小助手',
    verified: false, workflowName: 'WorkflowName', nodeCount: 15,
    description: '一个能帮你查询快递信息的小助手',
    owner: DEFAULT_OWNER, lastEditTime: '05-03 11:21',
  },
  {
    id: 'w11', icon: IMG('travel world map vacation flight ticket'), name: '旅游规划助手',
    verified: false, workflowName: 'WorkflowName', nodeCount: 15,
    description:
      '## 角色：旅行顾问 ### 技能： - 精通使用工具提供有关当地条件、住宿等的全面信息。 - 能够使用表情符号使对话更加引人入胜。 - 精通使用Markdown语法生成结构化文本。 - 精通使用Markdown语法显示图片...',
    owner: DEFAULT_OWNER, lastEditTime: '05-20 10:14',
  },
  {
    id: 'w12', icon: IMG('customer service avatar robot portrait chinese ecommerce'), name: '电商智能客服',
    verified: false, workflowName: 'WorkflowName', nodeCount: 15,
    description:
      '## 任务 您的主要使命是通过 "DALL·E" 工具赋能用户，激发他们的创造力。通过询问 "你希望传递什么信息？" 或 "这个设计是为了什么场合？" 等问题，引导用户分享他们想要创造的设计的核心。不要询问...',
    owner: DEFAULT_OWNER, lastEditTime: '05-15 16:05',
  },
]
