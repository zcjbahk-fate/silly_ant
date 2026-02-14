<template>
  <div class="status-card">
    <!-- 顶部环境信息 -->
    <div class="env-banner">
      <div class="env-row">
        <span class="env-time-group">{{ timeDisplay }}</span>
      </div>
      <div class="env-row">
        <span class="env-loc">{{ location }}</span>
        <span class="env-loc">{{ weather }}</span>
      </div>
    </div>

    <!-- Tab切换 -->
    <div class="tabs">
      <button class="tab-button" :class="{ active: activeTab === 'main' }" @click="activeTab = 'main'">自我</button>
      <button class="tab-button" :class="{ active: activeTab === 'chars' }" @click="activeTab = 'chars'">众美</button>
    </div>

    <!-- Tab内容 -->
    <div class="tab-container">
      <!-- 自我页面 -->
      <div v-if="activeTab === 'main'" class="tab-page active">
        <!-- 肉棒状态 -->
        <div class="penis-card">
          <div
            style="
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              color: var(--c-lust-deep);
              margin-bottom: 5px;
            "
          >
            <span>{{ penisStatus }}</span>
            <span>{{ penisLength }} cm</span>
          </div>
          <div class="penis-bar-bg">
            <div class="penis-bar-fill" :style="{ width: penisPercent + '%' }"></div>
            <div class="penis-dot" :style="{ left: penisPercent + '%' }"></div>
          </div>
          <div style="font-size: 0.85em; color: #888; font-style: italic">"{{ penisDesc }}"</div>
        </div>

        <!-- 情报掌握 -->
        <div class="section-header">情报掌握</div>
        <div id="mc-intel-area">
          <div v-for="char in intelChars" :key="char.name" style="margin-bottom: 5px">
            <div class="intel-char-btn" @click="toggleIntel(char.name)">
              <span style="font-weight: bold">{{ char.name }}</span>
              <span class="toggle-icon" :class="{ rotated: char.expanded }">▼</span>
            </div>
            <div class="intel-list" :class="{ show: char.expanded }">
              <div v-if="char.known" style="font-size: 0.8em; color: #aaa; margin-bottom: 2px">已知</div>
              <div v-if="char.known">
                <span v-for="tag in parseTags(char.known)" :key="tag" class="intel-tag tag-known">{{ tag }}</span>
              </div>
              <div v-if="char.unknown" style="font-size: 0.8em; color: #aaa; margin: 4px 0 2px 0">未知</div>
              <div v-if="char.unknown">
                <span v-for="tag in parseTags(char.unknown)" :key="tag" class="intel-tag tag-unknown">{{ tag }}</span>
              </div>
            </div>
          </div>
          <div v-if="intelChars.length === 0" style="color: #999; text-align: center">暂无情报</div>
        </div>

        <!-- 随身物品 -->
        <div class="section-header">随身物品</div>
        <div class="card-box">
          <div v-for="(item, name) in items" :key="name" class="kv-row">
            <span class="k-label">{{ name }} x{{ item.数量 }}</span>
            <span class="v-val" style="font-size: 0.85em; color: #666">{{ item.效果 || '' }}</span>
          </div>
          <div v-if="Object.keys(items).length === 0" style="color: #999; font-size: 0.9em">背包空空</div>
        </div>

        <!-- 技能能力 -->
        <div class="section-header">技能能力</div>
        <div>
          <div v-for="(desc, name) in skills" :key="name" class="card-box" style="padding: 8px">
            <div style="font-weight: bold; color: var(--text-primary); font-size: 0.9em">★ {{ name }}</div>
            <div style="font-size: 0.85em; color: var(--text-secondary)">{{ desc }}</div>
          </div>
          <div v-if="Object.keys(skills).length === 0" style="color: #999; font-size: 0.9em">暂无技能</div>
        </div>

        <!-- 战绩统计 -->
        <div class="section-header">战绩统计</div>
        <div>
          <template v-for="(exp, name) in sexExp" :key="name">
            <div style="margin: 5px 0 2px 5px; font-size: 0.85em; font-weight: bold; color: var(--accent)">
              ♥ {{ name }}
            </div>
            <div class="sex-grid">
              <div class="sex-item">
                <span class="sex-icon">👄</span>
                <span class="sex-num">{{ exp.口交 || 0 }}</span>
              </div>
              <div class="sex-item">
                <span class="sex-icon">🦶</span>
                <span class="sex-num">{{ exp.足交 || 0 }}</span>
              </div>
              <div class="sex-item">
                <span class="sex-icon">💓</span>
                <span class="sex-num">{{ exp.插入 || 0 }}</span>
              </div>
              <div class="sex-item">
                <span class="sex-icon">🍩</span>
                <span class="sex-num">{{ exp.肛交 || 0 }}</span>
              </div>
              <div class="sex-item">
                <span class="sex-icon">👋</span>
                <span class="sex-num">{{ exp.手交 || 0 }}</span>
              </div>
            </div>
          </template>
          <div v-if="Object.keys(sexExp).length === 0" style="color: #999; text-align: center">处男</div>
        </div>
      </div>

      <!-- 众美页面 -->
      <div v-if="activeTab === 'chars'" class="tab-page active">
        <!-- 角色列表 -->
        <div v-if="viewMode === 'list'">
          <div
            v-for="(char, name) in characters"
            :key="name"
            class="card-box char-list-item"
            @click="showCharDetail(name)"
          >
            <div>
              <div style="font-weight: bold; font-size: 1.05em">
                {{ name }}
                <span v-if="char.年龄" class="age-badge">{{ char.年龄 }}岁</span>
              </div>
              <div style="font-size: 0.8em; color: var(--text-secondary); margin-top: 2px">
                {{ char.当前姿势 || '无记录' }}
              </div>
            </div>
            <div style="text-align: right; font-size: 0.9em">
              <div style="color: var(--c-love-deep)">♥ {{ char.好感度 || 0 }}</div>
              <div style="color: var(--c-lust-deep)">♨ {{ char.性欲值 || 0 }}</div>
            </div>
          </div>
          <div v-if="Object.keys(characters).length === 0" style="padding: 20px; text-align: center; color: #999">
            暂无角色
          </div>
        </div>

        <!-- 角色详情 -->
        <div v-if="viewMode === 'detail'">
          <div class="back-btn" @click="viewMode = 'list'">‹ 返回列表</div>

          <h3 style="margin: 0 0 10px 0; display: flex; justify-content: space-between; align-items: center">
            <span>
              <span>{{ selectedCharName }}</span>
              <small v-if="selectedChar?.年龄" style="font-weight: normal; color: #888; font-size: 0.6em">
                {{ selectedChar.年龄 }}岁</small
              >
            </span>
            <span
              style="
                font-size: 0.6em;
                font-weight: normal;
                padding: 3px 6px;
                background: rgba(0, 0, 0, 0.05);
                border-radius: 4px;
              "
              >{{ selectedChar?.当前姿势 || '' }}</span
            >
          </h3>

          <!-- 属性滑条 -->
          <div>
            <SliderBar label="♥ 好感度" :value="selectedChar?.好感度 || 0" color1="#ffdde1" color2="#ee9ca7" />
            <SliderBar label="☠ 堕落度" :value="selectedChar?.堕落度 || 0" color1="#e0c3fc" color2="#8e44ad" />
            <SliderBar label="♨ 性欲值" :value="selectedChar?.性欲值 || 0" color1="#ffcfdf" color2="#ff0a54" />
          </div>

          <!-- NTR监控 -->
          <div class="section-header">NTR 监控</div>
          <div class="card-box">
            <div class="kv-row">
              <span class="k-label">NTR对象</span>
              <span class="v-val" style="color: var(--c-ntr-deep)">{{ selectedChar?.NTR关系?.NTR对象 || '无' }}</span>
            </div>
            <SliderBar label="♻️ NTR值" :value="selectedChar?.NTR关系?.数值 || 0" color1="#d4fc79" color2="#96e6a1" />
          </div>

          <!-- 内心活动 -->
          <div class="section-header">内心活动</div>
          <div>
            <div style="margin-bottom: 6px">
              <div style="font-size: 0.8em; color: #aaa">内心想法</div>
              <div class="card-box" style="font-size: 0.9em; color: #555; font-style: italic">
                "{{ selectedChar?.内心想法 || '...' }}"
              </div>
            </div>
            <div>
              <div style="font-size: 0.8em; color: #aaa">对主角印象</div>
              <div>
                <span v-for="tag in parseTags(selectedChar?.对主角看法)" :key="tag" class="intel-tag tag-known">{{
                  tag
                }}</span>
              </div>
            </div>
          </div>

          <!-- 情报认知 -->
          <div class="section-header">情报认知</div>
          <div class="card-box">
            <div style="margin-bottom: 6px">
              <div style="font-size: 0.8em; color: #aaa">对主角已知</div>
              <div>
                <span v-for="tag in parseTags(selectedChar?.对主角已知)" :key="tag" class="intel-tag tag-known">{{
                  tag
                }}</span>
              </div>
            </div>
            <div>
              <div style="font-size: 0.8em; color: #aaa">对主角未知</div>
              <div>
                <span v-for="tag in parseTags(selectedChar?.对主角未知)" :key="tag" class="intel-tag tag-unknown">{{
                  tag
                }}</span>
              </div>
            </div>
          </div>

          <!-- 衣物状态 -->
          <div class="section-header">衣物状态</div>
          <div class="card-box">
            <div v-for="item in clothingItems" :key="item.key" class="cloth-row">
              <template v-if="item.cloth">
                <div class="cloth-name">{{ item.key }}: {{ getClothName(item.cloth) }}</div>
                <div class="cloth-status-box">{{ getClothStatus(item.cloth) }}</div>
              </template>
            </div>
            <div
              v-if="selectedChar?.特殊"
              style="font-size: 0.85em; color: var(--accent); margin-top: 5px; text-align: right"
            >
              ★ {{ selectedChar.特殊 }}
            </div>
          </div>

          <!-- 性爱记录 -->
          <div class="section-header">性爱记录</div>
          <div class="card-box">
            <div v-for="(semen, name) in selectedChar?.体内精液" :key="name" class="kv-row">
              <span class="k-label">{{ name }}</span>
              <span class="v-val" style="font-size: 0.85em">{{ semen.量 }}ml ({{ semen.状态 }})</span>
            </div>
            <div
              v-if="!selectedChar?.体内精液 || Object.keys(selectedChar.体内精液).length === 0"
              style="color: #999; font-size: 0.9em"
            >
              子宫空空
            </div>
          </div>
          <div v-if="selectedChar?.上次做爱?.时间" class="card-box">
            <div class="kv-row">
              <span class="k-label">时间</span>
              <span class="v-val">{{ selectedChar.上次做爱.时间 }}</span>
            </div>
            <div class="kv-row">
              <span class="k-label">对象</span>
              <span class="v-val">{{ selectedChar.上次做爱.对象 }}</span>
            </div>
            <div style="font-size: 0.85em; color: #666; text-align: right; margin-top: 2px">
              {{ selectedChar.上次做爱.地点 }} · {{ selectedChar.上次做爱.方式 }}
            </div>
          </div>
          <div v-else class="card-box" style="color: #999; font-size: 0.9em">暂无记录</div>

          <!-- 性经历 -->
          <div class="section-header">性经历</div>
          <div>
            <template v-for="(exp, name) in selectedChar?.性经历" :key="name">
              <div style="margin: 5px 0 2px 0; font-size: 0.85em">vs {{ name }}</div>
              <div class="sex-grid">
                <div class="sex-item">
                  <span class="sex-icon">👄</span>
                  <span class="sex-num">{{ exp.口交 || 0 }}</span>
                </div>
                <div class="sex-item">
                  <span class="sex-icon">🦶</span>
                  <span class="sex-num">{{ exp.足交 || 0 }}</span>
                </div>
                <div class="sex-item">
                  <span class="sex-icon">💓</span>
                  <span class="sex-num">{{ exp.插入 || 0 }}</span>
                </div>
                <div class="sex-item">
                  <span class="sex-icon">🍩</span>
                  <span class="sex-num">{{ exp.肛交 || 0 }}</span>
                </div>
                <div class="sex-item">
                  <span class="sex-icon">👋</span>
                  <span class="sex-num">{{ exp.手交 || 0 }}</span>
                </div>
              </div>
            </template>
            <div v-if="!selectedChar?.性经历 || Object.keys(selectedChar.性经历).length === 0">无</div>
          </div>
          <div style="height: 30px"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import SliderBar from './components/SliderBar.vue';
import { useDataStore } from './store';

const store = useDataStore();

// Tab状态
const activeTab = ref<'main' | 'chars'>('main');
const viewMode = ref<'list' | 'detail'>('list');
const selectedCharName = ref<string>('');
const expandedIntel = ref<Record<string, boolean>>({});

// 计算属性
const timeDisplay = computed(() => {
  const sys = store.data?.系统;
  const timeEnd = sys?.时间段?.尾 || '未知';
  const passed = sys?.时间段?.经过时间 || 0;
  return `${timeEnd} ${passed > 0 ? `(+${passed}min)` : ''}`;
});

const location = computed(() => store.data?.系统?.地点 || '未知');
const weather = computed(() => store.data?.系统?.天气 || '');

const penisData = computed(() => store.data?.主角?.性器状态?.肉棒);
const penisStatus = computed(() => penisData.value?.状态 || '常态');
const penisLength = computed(() => penisData.value?.当前长度 || 0);
const penisPercent = computed(() => {
  const cur = penisData.value?.当前长度 || 0;
  const min = penisData.value?.长度范围?.最小 || 5;
  const max = penisData.value?.长度范围?.最大 || 18;
  return Math.min(100, Math.max(0, ((cur - min) / (max - min)) * 100));
});
const penisDesc = computed(() => penisData.value?.描述 || '...');

const items = computed(() => store.data?.主角?.持有重要物品 || {});
const skills = computed(() => store.data?.主角?.技能 || {});
const sexExp = computed(() => store.data?.主角?.性经历 || {});

const intelChars = computed(() => {
  const known = store.data?.主角?.对角色已知 || {};
  const unknown = store.data?.主角?.对角色未知 || {};
  const allChars = new Set([...Object.keys(known), ...Object.keys(unknown)]);

  return Array.from(allChars).map(name => ({
    name,
    known: known[name],
    unknown: unknown[name],
    expanded: expandedIntel.value[name] || false,
  }));
});

const characters = computed(() => store.data?.角色 || {});
const selectedChar = computed(() => {
  if (!selectedCharName.value) return null;
  return characters.value[selectedCharName.value] || null;
});

const clothingItems = computed(() => {
  const char = selectedChar.value;
  if (!char) return [];
  return [
    { key: '上身', cloth: char.上身 },
    { key: '下身', cloth: char.下身 },
    { key: '腿部', cloth: char.腿部 },
    { key: '鞋子', cloth: char.鞋子 },
    { key: '配饰', cloth: char.配饰 },
  ];
});

// 方法
function parseTags(text: string | undefined): string[] {
  if (!text || text === '无' || text === '...') return [];
  return text.split(/\s*\/\s*/).filter(i => i.trim());
}

function toggleIntel(name: string) {
  expandedIntel.value[name] = !expandedIntel.value[name];
}

function showCharDetail(name: string) {
  selectedCharName.value = name;
  viewMode.value = 'detail';
}

function getClothName(cloth: any): string {
  if (typeof cloth === 'string') return cloth;
  return cloth?.名称 || '未知';
}

function getClothStatus(cloth: any): string {
  if (typeof cloth === 'string') return '未脱';
  return cloth?.状态 || '未脱';
}

// store已经通过useIntervalFn和watchIgnorable自动同步数据，无需额外监听
</script>

<style scoped>
/* SliderBar组件样式 */
</style>
