<script setup lang="ts">
import { useRouter } from 'vue-router'
import forbiddenImage from '@/assets/images/forbidden.png'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-white px-6">
    <img :src="forbiddenImage" alt="403" class="w-[360px] max-w-full" />
    <div class="mt-2 text-[20px] font-medium leading-7 text-[#1d2129]">
      抱歉，你无权访问该页面
    </div>
    <div class="mt-2 text-center text-[14px] leading-[22px] text-[#86909c]">
      当前账号暂无访问权限，如需访问请联系管理员。
    </div>
    <a-button type="primary" class="mt-8 w-[120px]" @click="goHome">
      返回首页
    </a-button>
  </div>
</template>
