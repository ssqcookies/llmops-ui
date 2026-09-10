/**
 * 添加文件页面 —— 模块独有类型定义
 */

/** 步骤标识：1 上传 / 2 分段设置 / 3 数据处理 */
export type AddFileStep = 1 | 2 | 3

/** 分段模式 —— 对齐后端 process_type 取值 */
export type SegmentMode = 'automatic' | 'custom'

/** 已上传文件项（对齐 upload-files/file 响应） */
export interface UploadedFile {
  /** upload-files/file 返回的文件 id */
  id: string
  name: string
  size: number
  extension: string
}

/** 处理中文档项 —— 对齐 GetDocumentsStatusResponse data 数组元素 */
export interface ProcessingDoc {
  id: string
  name: string
  size: number
  extension: string
  mime_type: string
  position: number
  segment_count: number
  completed_segment_count: number
  status: string
  error: string
  processing_started_at: number
  parsing_completed_at: number
  splitting_completed_at: number
  indexing_completed_at: number
  completed_at: number
  stopped_at: number
  created_at: number
}

/** 自定义分段表单（页面步骤 2 自定义卡片） */
export interface CustomSegmentForm {
  /** 分段标识符原始文本（多个标识符使用英文逗号分割） */
  separatorsText: string
  /** 分段最大长度（100 - 1000） */
  chunkSize?: number
  /** 文本预处理规则：替换掉连续的空格、换行符和制表符 */
  removeExtraSpaces: boolean
  /** 文本预处理规则：删除所有 URL 和电子邮件地址 */
  removeUrlsEmails: boolean
}
