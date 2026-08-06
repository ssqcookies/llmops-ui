import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import { pinia } from './stores'
import { setupPlugins } from './plugins'

import ArcoVue from '@arco-design/web-vue';
import '@arco-design/web-vue/dist/arco.css';
import '@/assets/styles/main.css'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(ArcoVue);

setupPlugins(app)

app.mount('#app')
