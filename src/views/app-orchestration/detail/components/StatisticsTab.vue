<script setup lang="ts">import { ref, computed } from 'vue';
import type { StatisticsOverview } from '../types';
const overview = ref<StatisticsOverview>({
 totalConversations: 12856,
 totalTokens: 3456789,
 activeUsers: 892,
 trend: [
 { date: '08-01', conversations: 320, tokens: 86400 },
 { date: '08-02', conversations: 410, tokens: 110700 },
 { date: '08-03', conversations: 380, tokens: 102600 },
 { date: '08-04', conversations: 520, tokens: 140400 },
 { date: '08-05', conversations: 460, tokens: 124200 },
 { date: '08-06', conversations: 610, tokens: 164700 },
 { date: '08-07', conversations: 550, tokens: 148500 },
 ],
 sessions: [
 { sessionId: 's-001', user: '张三', tokenCount: 2340, messageCount: 12, time: '2026-08-07 14:30' },
 { sessionId: 's-002', user: '李四', tokenCount: 1560, messageCount: 8, time: '2026-08-07 13:15' },
 { sessionId: 's-003', user: '王五', tokenCount: 4200, messageCount: 20, time: '2026-08-07 11:45' },
 { sessionId: 's-004', user: '赵六', tokenCount: 890, messageCount: 5, time: '2026-08-07 10:20' },
 { sessionId: 's-005', user: '钱七', tokenCount: 3100, messageCount: 15, time: '2026-08-07 09:30' },
 ],
});
const userSearch = ref('');
type DateRangeKey = '7d' | '30d' | '90d';
const dateRange = ref<DateRangeKey>('7d');
const dateRangeOptions: { key: DateRangeKey; label: string }[] = [
  { key: '7d', label: '近 7 天' },
  { key: '30d', label: '近 30 天' },
  { key: '90d', label: '近 90 天' },
];
const filteredSessions = computed(() => {
 if (!userSearch.value.trim())
 return overview.value.sessions;
 const kw = userSearch.value.trim().toLowerCase();
 return overview.value.sessions.filter((s) => s.user.toLowerCase().includes(kw));
});
const maxConversations = computed(() => {
 return Math.max(...overview.value.trend.map((t) => t.conversations));
});
const trendLabels = computed(() => overview.value.trend.map((t) => t.date));
const trendBars = computed(() => {
 return overview.value.trend.map((t) => ({
 ...t,
 height: Math.round((t.conversations / maxConversations.value) * 100),
 }));
});
const conversationTrend = computed(() => {
 const data = overview.value.trend;
 if (data.length < 2)
 return { value: 0, up: true };
 const prev = data[0]!.conversations;
 const curr = data[data.length - 1]!.conversations;
 const diff = curr - prev;
 const pct = prev === 0 ? 0 : Math.round((diff / prev) * 100);
 return { value: Math.abs(pct), up: diff >= 0 };
});
const tokenTrend = computed(() => {
 const data = overview.value.trend;
 if (data.length < 2)
 return { value: 0, up: true };
 const prev = data[0]!.tokens;
 const curr = data[data.length - 1]!.tokens;
 const diff = curr - prev;
 const pct = prev === 0 ? 0 : Math.round((diff / prev) * 100);
 return { value: Math.abs(pct), up: diff >= 0 };
});
const userTrend = computed(() => ({ value: 12, up: true }));
function formatNumber(n: number): string {
 if (n >= 10000)
 return (n / 10000).toFixed(1) + '万';
 return n.toLocaleString();
}
</script>

<template>
  <div class="p-5">
    <div class="flex gap-4 mb-5">
      <div class="flex-1 rounded-lg border border-[#e5e6eb] p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-[#86909c]">总对话数</span>
          <span
            class="inline-flex items-center gap-0.5 text-xs font-medium"
            :class="conversationTrend.up ? 'text-green-600' : 'text-red-500'"
          >
            <svg
              v-if="conversationTrend.up"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
            <svg
              v-else
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {{ conversationTrend.value }}%
          </span>
        </div>
        <div class="text-2xl font-semibold text-[#1d2129]">
          {{ formatNumber(overview.totalConversations) }}
        </div>
      </div>

      <div class="flex-1 rounded-lg border border-[#e5e6eb] p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-[#86909c]">Token 总量</span>
          <span
            class="inline-flex items-center gap-0.5 text-xs font-medium"
            :class="tokenTrend.up ? 'text-green-600' : 'text-red-500'"
          >
            <svg
              v-if="tokenTrend.up"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
            <svg
              v-else
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {{ tokenTrend.value }}%
          </span>
        </div>
        <div class="text-2xl font-semibold text-[#1d2129]">
          {{ formatNumber(overview.totalTokens) }}
        </div>
      </div>

      <div class="flex-1 rounded-lg border border-[#e5e6eb] p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-[#86909c]">活跃用户数</span>
          <span
            class="inline-flex items-center gap-0.5 text-xs font-medium"
            :class="userTrend.up ? 'text-green-600' : 'text-red-500'"
          >
            <svg
              v-if="userTrend.up"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
            <svg
              v-else
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {{ userTrend.value }}%
          </span>
        </div>
        <div class="text-2xl font-semibold text-[#1d2129]">
          {{ formatNumber(overview.activeUsers) }}
        </div>
      </div>
    </div>

    <div class="rounded-lg border border-[#e5e6eb] p-5 mb-5">
      <div class="flex items-center justify-between mb-4">
        <span class="font-medium text-sm text-[#1d2129]">对话量趋势（近 7 天）</span>
        <div class="flex items-center gap-1 text-xs text-[#86909c]">
          <span class="inline-block w-3 h-3 rounded-sm bg-[#1677ff]"></span>
          <span>对话数</span>
        </div>
      </div>
      <div class="flex items-end gap-3 h-48 px-2">
        <div
          v-for="bar in trendBars"
          :key="bar.date"
          class="flex-1 flex flex-col items-center gap-2"
        >
          <div class="w-full flex-1 flex items-end">
            <div
              class="w-full rounded-t bg-gradient-to-t from-[#1677ff] to-[#4096ff] transition-all duration-300"
              :style="{ height: bar.height + '%' }"
            ></div>
          </div>
          <span class="text-xs text-[#86909c]">{{ bar.date }}</span>
        </div>
      </div>
    </div>

    <div class="rounded-lg border border-[#e5e6eb] p-5">
      <div class="flex items-center justify-between mb-4">
        <span class="font-medium text-sm text-[#1d2129]">会话记录</span>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-0.5 p-0.5 bg-[#f2f3f5] rounded">
            <button
              v-for="r in dateRangeOptions"
              :key="r.key"
              class="px-3 py-1 text-xs rounded transition-colors"
              :class="dateRange === r.key ? 'bg-white text-[#1677ff] font-medium' : 'text-[#4e5969] hover:text-[#1d2129]'"
              @click="dateRange = r.key"
            >
              {{ r.label }}
            </button>
          </div>
          <div class="relative">
            <input
              v-model="userSearch"
              type="text"
              placeholder="搜索用户"
              class="w-48 pl-8 pr-3 py-2 text-sm border border-[#e5e6eb] rounded-md outline-none focus:border-[#1677ff] transition-colors"
            />
            <svg
              class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86909c]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>
      </div>

      <div
        v-if="filteredSessions.length === 0"
        class="flex flex-col items-center justify-center py-12"
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="100" cy="100" r="80" fill="#f7f8fa" />
          <rect x="55" y="60" width="90" height="80" rx="4" fill="white" stroke="#e5e6eb" stroke-width="2" />
          <line x1="75" y1="85" x2="125" y2="85" stroke="#e5e6eb" stroke-width="2" stroke-linecap="round" />
          <line x1="75" y1="100" x2="110" y2="100" stroke="#e5e6eb" stroke-width="2" stroke-linecap="round" />
          <line x1="75" y1="115" x2="120" y2="115" stroke="#e5e6eb" stroke-width="2" stroke-linecap="round" />
          <line x1="75" y1="130" x2="100" y2="130" stroke="#e5e6eb" stroke-width="2" stroke-linecap="round" />
        </svg>
        <p class="mt-3 text-sm text-[#86909c]">暂无会话记录</p>
      </div>

      <div v-else class="border border-[#e5e6eb] rounded-lg overflow-hidden">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-[#fafafa]">
              <th class="text-left px-4 py-3 font-medium text-[#1d2129] w-44">时间</th>
              <th class="text-left px-4 py-3 font-medium text-[#1d2129] w-28">用户</th>
              <th class="text-left px-4 py-3 font-medium text-[#1d2129] w-36">Token 消耗</th>
              <th class="text-left px-4 py-3 font-medium text-[#1d2129] w-28">消息数</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="session in filteredSessions"
              :key="session.sessionId"
              class="border-t border-[#e5e6eb] hover:bg-[#fafbfc] transition-colors"
            >
              <td class="px-4 py-3 text-[#4e5969]">{{ session.time }}</td>
              <td class="px-4 py-3 text-[#4e5969]">{{ session.user }}</td>
              <td class="px-4 py-3 text-[#4e5969]">{{ formatNumber(session.tokenCount) }}</td>
              <td class="px-4 py-3 text-[#4e5969]">{{ session.messageCount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>