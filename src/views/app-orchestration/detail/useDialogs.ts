import { reactive } from 'vue'

/**
 * 弹窗/抽屉显隐状态集中管理
 * 全部 12 个弹窗/抽屉
 */
export interface DialogState {
  /** M1 模型设置 */
  modelSettingsDialog: boolean
  /** M2 工具信息（插件详情） */
  pluginDetailDialog: boolean
  /** M3 添加插件 */
  addPluginDrawer: boolean
  /** M4 关联工作流 */
  workflowDrawer: boolean
  /** M5 添加知识库 */
  knowledgeDrawer: boolean
  /** M6 检索设置 */
  retrievalDialog: boolean
  /** M7 长期记忆 */
  longTermMemoryDialog: boolean
  /** M8 语音输出设置 */
  voiceOutputDialog: boolean
  /** M9 内容审查设置 */
  moderationDialog: boolean
  /** M10 发布历史 */
  publishHistoryDrawer: boolean
  /** M11 取消发布确认 */
  cancelPublishConfirmDialog: boolean
  /** M12 更新发布确认 */
  updatePublishConfirmDialog: boolean
}

const state = reactive<DialogState>({
  modelSettingsDialog: false,
  pluginDetailDialog: false,
  addPluginDrawer: false,
  workflowDrawer: false,
  knowledgeDrawer: false,
  retrievalDialog: false,
  longTermMemoryDialog: false,
  voiceOutputDialog: false,
  moderationDialog: false,
  publishHistoryDrawer: false,
  cancelPublishConfirmDialog: false,
  updatePublishConfirmDialog: false,
})

export function useDialogs() {
  function open(key: keyof DialogState): void {
    state[key] = true
  }

  function close(key: keyof DialogState): void {
    state[key] = false
  }

  return { dialogs: state, open, close }
}
