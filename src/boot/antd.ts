import { boot } from 'quasar/wrappers'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import { App } from 'vue'

export default boot(({ app }: { app: App }) => {
  app.use(Antd)
})
