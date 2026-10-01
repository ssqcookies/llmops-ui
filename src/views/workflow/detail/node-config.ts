import type { NodeMeta, WorkflowNodeType, WorkflowNodeData } from './types'

/** 8 种节点的元数据定义 */
export const NODE_META: Record<WorkflowNodeType, NodeMeta> = {
  start: {
    type: 'start',
    label: '开始节点',
    description: '工作流的起点节点，支持定义工作流的起点输入等信息。',
    icon: 'icon-play-circle',
    color: '#165dff',
    inputs: [
      { name: 'query', type: 'String' },
      { name: 'location', type: 'String' },
    ],
    outputs: [],
  },
  llm: {
    type: 'llm',
    label: '大语言模型',
    description: '调用大语言模型，根据输入参数和提示词生成回复。',
    icon: 'icon-robot',
    color: '#165dff',
    inputs: [
      { name: 'query', type: 'String', required: true },
      { name: 'location', type: 'String' },
    ],
    // 契约固定输出变量：output（后端强制覆盖）
    outputs: [{ name: 'output', type: 'String' }],
  },
  plugin: {
    type: 'plugin',
    label: '扩展插件',
    description: '添加插件广场内或自定义 API 插件，支持能力扩展和复用。',
    icon: 'icon-tool',
    color: '#ff7d00',
    inputs: [{ name: 'location', type: 'String', required: true }],
    // 契约固定输出变量：text（后端强制覆盖）
    outputs: [{ name: 'text', type: 'String' }],
  },
  knowledge_retrieval: {
    type: 'knowledge_retrieval',
    label: '知识库检索',
    description: '根据输入的参数，在选定的知识库中检索相关片段并召回，返回切片列表。',
    icon: 'icon-book',
    color: '#722ed1',
    inputs: [{ name: 'query', type: 'String', required: true }],
    outputs: [{ name: 'combine_documents', type: 'String' }],
  },
  template: {
    type: 'template',
    label: '模板转换',
    description: '对多个字符串变量的格式进行处理。',
    icon: 'icon-edit',
    color: '#722ed1',
    inputs: [{ name: 'content', type: 'String', required: true }],
    outputs: [{ name: 'output', type: 'String' }],
  },
  http_request: {
    type: 'http_request',
    label: 'HTTP请求',
    description: '配置外部 API 服务，并发起请求。',
    icon: 'icon-link',
    color: '#f53f3f',
    inputs: [],
    // 契约固定输出变量：status_code（int）+ text（string）
    outputs: [
      { name: 'status_code', type: 'int' },
      { name: 'text', type: 'String' },
    ],
  },
  python: {
    type: 'python',
    label: 'Python代码执行',
    description: '编写代码，处理输入输出变量来生成返回值。',
    icon: 'icon-code',
    color: '#722ed1',
    inputs: [{ name: 'input', type: 'String' }],
    // 契约示例输出变量：result（generated）
    outputs: [{ name: 'result', type: 'String' }],
  },
  end: {
    type: 'end',
    label: '结束',
    description: '工作流的结束节点，支持定义工作流最终输出的变量等信息。',
    icon: 'icon-check-circle',
    color: '#f53f3f',
    inputs: [],
    outputs: [
      { name: 'query', type: 'String' },
      { name: 'location', type: 'String' },
      { name: 'context', type: 'String' },
    ],
  },
}

/** 节点类型数组（按节点库展示顺序） */
export const NODE_TYPES: WorkflowNodeType[] = [
  'start',
  'llm',
  'plugin',
  'knowledge_retrieval',
  'template',
  'http_request',
  'python',
  'end',
]

/** 根据节点类型创建默认节点 data */
export const createDefaultNodeData = (type: WorkflowNodeType): WorkflowNodeData => {
  const meta = NODE_META[type]
  const base: WorkflowNodeData = {
    nodeType: type,
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
    inputs: meta.inputs.map((f) => ({ ...f })),
    outputs: meta.outputs.map((f) => ({ ...f })),
  }
  if (type === 'knowledge_retrieval') {
    base.knowledgeBases = []
    base.dataset_ids = []
    base.retrievalStrategy = 'hybrid'
    base.retrieval_config = {
      max_results: 5,
      min_score: 0.05,
      strategy: 'hybrid',
    }
    base.maxResults = 5
    base.minScore = 0.05
  }
  if (type === 'llm') {
    base.prompt = ''
    base.model = ''
    base.model_config = {
      model: '',
      provider: '',
      temperature: 0.7,
      topP: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      contextRounds: 10,
      maxReplyLength: 2048,
    }
  }
  if (type === 'template') {
    base.template = ''
  }
  if (type === 'http_request') {
    base.method = 'GET'
    base.url = ''
    base.headers = []
    base.params = []
    base.body = []
  }
  if (type === 'python') {
    base.code = ''
  }
  return base
}
