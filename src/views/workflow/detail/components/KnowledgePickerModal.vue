<script setup lang="ts">
/**
 * 选择引用知识库弹窗
 * 数据来源：GET /datasets（分页 + 关键字搜索）
 * 卡片式多选，确认后把选中的知识库回传给父组件
 */
import { ref, watch } from 'vue'
import { getDatasetsWithPage } from '@/services/dataset'
import type { LinkedKnowledge } from '../types'

const props = defineProps({
  /** 弹窗显示状态 */
  visible: {
    type: Boolean,
    required: true,
    default: false,
  },
  /** 已关联的知识库（打开时默认勾选） */
  selected: {
    type: Array as () => LinkedKnowledge[],
    default: () => [],
  },
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  /** 确认选择：返回完整的选中知识库列表（id + name） */
  (e: 'confirm', list: LinkedKnowledge[]): void
}>()

/** 知识库列表项（接口原始数据） */
interface DatasetItem {
  id: string
  name: string
  icon: string
  description: string
  document_count: number
}

/** 列表加载状态 */
const loading = ref(false)
/** 知识库列表 */
const list = ref<DatasetItem[]>([])
/** 搜索关键字 */
const keyword = ref('')
/** 弹窗内临时选中的 ID 集合 */
const checkedIds = ref<Set<string>>(new Set())
/** 空数据标识 */
const isEmpty = ref(false)

/** 查询知识库列表（打开弹窗及搜索时调用，后端限制每页最多 50 条） */
const fetchList = async () => {
  try {
    loading.value = true
    const resp = await getDatasetsWithPage(1, 50, keyword.value.trim())
    list.value = (resp.data.list ?? []) as DatasetItem[]
    isEmpty.value = list.value.length === 0
  } catch (e) {
    console.error('[getDatasetsWithPage] failed:', e)
    list.value = []
    isEmpty.value = true
  } finally {
    loading.value = false
  }
}

// 每次打开：初始化勾选状态、清空搜索并拉取最新列表
watch(
  () => props.visible,
  (val) => {
    if (!val) return
    checkedIds.value = new Set(props.selected.map((k) => k.id))
    keyword.value = ''
    void fetchList()
  },
)

/** 切换某张卡片的选中状态 */
const toggleCheck = (id: string) => {
  const next = new Set(checkedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  checkedIds.value = next
}

/** 关闭弹窗（不保存本次选择） */
const handleCancel = () => emit('update:visible', false)

/** 确认选择：以列表顺序输出 id+name+icon，列表中不存在但之前已选的保留 */
const handleConfirm = () => {
  const picked: LinkedKnowledge[] = list.value
    .filter((d) => checkedIds.value.has(d.id))
    .map((d) => ({ id: d.id, name: d.name, icon: d.icon ?? '' }))
  // 兼容已选但本次列表未加载到（如翻页/搜索过滤）的知识库
  props.selected.forEach((k) => {
    if (checkedIds.value.has(k.id) && !picked.some((p) => p.id === k.id)) {
      picked.push({ id: k.id, name: k.name, icon: k.icon ?? '' })
    }
  })
  emit('confirm', picked)
  emit('update:visible', false)
}
</script>

<template>
  <a-modal
    :visible="visible"
    :width="640"
    :footer="false"
    :mask-closable="false"
    :body-style="{ paddingTop: '20px' }"
    @cancel="handleCancel"
    @update:visible="(val) => emit('update:visible', val)"
  >
    <!-- 标题 -->
    <div class="mb-4 flex items-center justify-between">
      <span class="text-[18px] font-semibold text-[#1d2129]">选择引用知识库</span>
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-full text-[#4e5969] transition-colors hover:bg-[#f2f3f5]"
        @click="handleCancel"
      >
        <icon-close :size="18" />
      </button>
    </div>

    <!-- 搜索框 -->
    <a-input
      v-model="keyword"
      placeholder="搜索知识库名称"
      allow-clear
      class="mb-4"
      @press-enter="fetchList"
      @clear="fetchList"
    >
      <template #prefix><icon-search :size="14" class="text-[#86909c]" /></template>
    </a-input>

    <!-- 知识库卡片列表 -->
    <a-spin :loading="loading" class="kb-picker-spin w-full">
      <div class="kb-list max-h-[420px] overflow-y-auto pr-1">
        <div
          v-for="item in list"
          :key="item.id"
          class="mb-2 flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors"
          :class="
            checkedIds.has(item.id)
              ? 'border-[#165dff] bg-[#f2f7ff]'
              : 'border-[#e5e6eb] bg-white hover:border-[#94bfff]'
          "
          @click="toggleCheck(item.id)"
        >
          <img
            v-if="item.icon"
            :src="item.icon"
            :alt="item.name"
            class="h-9 w-9 shrink-0 rounded-lg object-cover"
          />
          <div
            v-else
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f2f3f5] text-[#86909c]"
          >
            <icon-book :size="18" />
          </div>
          <span class="min-w-0 flex-1 truncate text-[15px] text-[#1d2129]">{{ item.name }}</span>
          <icon-check-circle-fill
            v-if="checkedIds.has(item.id)"
            :size="18"
            class="shrink-0 text-[#165dff]"
          />
        </div>

        <!-- 空状态 -->
        <div
          v-if="!loading && isEmpty"
          class="flex flex-col items-center justify-center py-12 text-[#86909c]"
        >
          <icon-empty :size="40" class="mb-2 text-[#c9cdd4]" />
          <span class="text-[13px]">暂无知识库</span>
        </div>
      </div>
    </a-spin>

    <!-- 底部操作 -->
    <div class="mt-4 flex items-center justify-between">
      <span class="text-[12px] text-[#86909c]">已选 {{ checkedIds.size }} 个知识库</span>
      <div class="flex gap-2">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handleConfirm">确定</a-button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
/* 卡片列表滚动条细化 */
.kb-list::-webkit-scrollbar {
  width: 6px;
}
.kb-list::-webkit-scrollbar-thumb {
  background: #e5e6eb;
  border-radius: 3px;
}
</style>
