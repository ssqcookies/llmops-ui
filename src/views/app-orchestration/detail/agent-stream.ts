/**
 * 调试对话模型原始输出解析
 *
 * 模型（如 Qwen 系列）思考内容的开标签 <think> 由聊天模板注入，
 * 不在模型生成内容中，模型自行生成 </think> 结束思考；
 * 工具返回结果以 <tool_call>...</tool_call> 内联在流中。
 * 解析器将思考/工具片段从正文中分离，避免混入回复气泡。
 */

export type InlineThoughtEvent = 'agent_thought' | 'agent_action'

export interface InlineThought {
  event: InlineThoughtEvent
  /** 片段原文（thought 为思考内容，tool 为工具返回） */
  text: string
}

export interface ParsedAgentStream {
  /** 干净正文 */
  answer: string
  /** 思考/工具片段（按出现顺序） */
  thoughts: InlineThought[]
  /** 当前所处模式：think=思考中 tool=工具调用中 answer=正文输出中 */
  mode: Mode
}

const OPEN_THINK = '<think>'
const CLOSE_THINK = '</think>'
const OPEN_TOOL = '<tool_call>'
const CLOSE_TOOL = '</tool_call>'

/** 全部标签（用于判断结尾不完整片段是否为尚未收全的标签前缀） */
const ALL_TAGS = [OPEN_THINK, CLOSE_THINK, OPEN_TOOL, CLOSE_TOOL]

const isTagPrefix = (s: string) => ALL_TAGS.some((t) => t.startsWith(s))

type Mode = 'answer' | 'think' | 'tool'

/**
 * 解析模型原始输出
 * @param raw 截至当前累积的全部 answer 文本
 * @param assumeThink 后端已通过 agent_thought 事件告知本次回复以思考开始
 */
export const parseAgentStream = (
  raw: string,
  assumeThink = false,
): ParsedAgentStream => {
  let answer = ''
  const thoughts: InlineThought[] = []
  let mode: Mode = assumeThink ? 'think' : 'answer'
  /** 思考过程中是否出现过标记（用于结束时判定纯普通回复） */
  let hasThinkMarker = assumeThink
  let current = ''
  let currentEvent: InlineThoughtEvent = 'agent_thought'

  const flushCurrent = () => {
    const text = current
    if (text) thoughts.push({ event: currentEvent, text })
    current = ''
  }

  let i = 0
  while (i < raw.length) {
    if (raw[i] === '<') {
      const rest = raw.slice(i)
      if (rest.startsWith(CLOSE_THINK)) {
        // 思考结束：若此前处于正文态（未收到开标签/事件），
        // 说明开标签由聊天模板注入，正文缓冲全部属于思考内容
        if (mode === 'answer' && answer) {
          thoughts.push({ event: 'agent_thought', text: answer })
          answer = ''
        } else if (mode !== 'answer') {
          flushCurrent()
        }
        mode = 'answer'
        hasThinkMarker = true
        i += CLOSE_THINK.length
        continue
      }
      if (rest.startsWith(OPEN_THINK)) {
        if (mode !== 'answer') flushCurrent()
        mode = 'think'
        currentEvent = 'agent_thought'
        hasThinkMarker = true
        i += OPEN_THINK.length
        continue
      }
      if (rest.startsWith(CLOSE_TOOL)) {
        if (mode === 'tool') flushCurrent()
        mode = 'answer'
        i += CLOSE_TOOL.length
        continue
      }
      if (rest.startsWith(OPEN_TOOL)) {
        if (mode !== 'answer') flushCurrent()
        mode = 'tool'
        currentEvent = 'agent_action'
        i += OPEN_TOOL.length
        continue
      }
      // 结尾可能是尚未收完整的标签：暂停解析等待更多内容
      if (isTagPrefix(rest)) break
      // 普通文本中的 '<'，落入当前目标
    }
    if (mode === 'answer') answer += raw[i]
    else current += raw[i]
    i += 1
  }
  // 未闭合的片段（流式中的思考/工具内容）先输出为片段
  if (current) thoughts.push({ event: currentEvent, text: current })

  // 从未出现任何思考标记：agent_thought 片段实为普通正文（非思考模型）；
  // agent_action（工具调用）片段仍然保留
  if (!hasThinkMarker && thoughts.some((t) => t.event === 'agent_thought')) {
    const prefix = thoughts
      .filter((t) => t.event === 'agent_thought')
      .map((t) => t.text)
      .join('')
    const tools = thoughts.filter((t) => t.event === 'agent_action')
    answer = prefix + answer
    thoughts.length = 0
    tools.forEach((t) => thoughts.push(t))
  }

  return { answer, thoughts, mode }
}
