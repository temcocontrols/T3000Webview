import { boot } from 'quasar/wrappers'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

export default boot(({ app }) => {
  app.use(Antd)
})
