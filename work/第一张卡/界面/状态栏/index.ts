import { waitUntil } from 'async-wait-until';
import App from './App.vue';
import './global.css';

$(errorCatched(async () => {
  // 等待 Mvu 初始化
  await waitGlobalInitialized('Mvu');
  
  // 等待 stat_data 存在
  await waitUntil(() => _.has(getVariables({ type: 'message' }), 'stat_data'));
  
  // 挂载 Vue 应用
  createApp(App).use(createPinia()).mount('#app');
}));
