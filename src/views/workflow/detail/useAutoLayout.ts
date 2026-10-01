/**
 * 工作流自适应布局工具（基于 Dagre）
 *
 * 使用步骤：
 *   1. 创建 dagre 图结构
 *   2. 设置布局参数（rankDir=LR 从左到右，align=UL 左上对齐）
 *   3. 深度拷贝节点/边数据，避免污染原始响应式对象
 *   4. 添加节点（含宽高）和边到图中
 *   5. 运行 dagre.layout() 计算布局
 *   6. 用计算结果更新节点坐标（dagre 返回中心点，vue-flow 用左上角，需偏移）
 */
import dagre from 'dagre'

/**
 * 计算并返回自适应布局后的节点列表（仅更新 position，不修改原数据）
 *
 * @param nodes 当前节点列表
 * @param edges 当前边列表
 * @returns 新的节点列表（position 已更新）
 */
export function applyAutoLayout(
  nodes: Record<string, any>[],
  edges: Record<string, any>[],
): Record<string, any>[] {
  if (!nodes.length) return nodes

  // 1. 创建 dagre 图
  const g = new dagre.graphlib.Graph()

  // 2. 设置布局参数
  g.setGraph({
    rankdir: 'LR', // 从左到右
    align: 'UL', // 左上对齐
    nodesep: 60, // 节点之间的间距
    ranksep: 120, // 层与层之间的间距
    marginx: 40,
    marginy: 40,
  })
  g.setDefaultEdgeLabel(() => ({}))

  // 3. 节点固定宽高
  const nodeWidth = 360
  const nodeHeight = 160

  // 4. 添加节点到图中
  nodes.forEach((node) => {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  // 5. 添加边到图中
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  // 6. 运行布局算法
  dagre.layout(g)

  // 7. 用计算结果更新节点坐标（dagre 的 x/y 是中心点，vue-flow position 是左上角）
  return nodes.map((node) => {
    const n = g.node(node.id)
    if (!n) return node
    return {
      ...node,
      position: {
        x: n.x - nodeWidth / 2,
        y: n.y - nodeHeight / 2,
      },
    }
  })
}
