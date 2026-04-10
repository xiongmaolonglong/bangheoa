/**
 * 通用组件导出
 */

import StatusTag from './StatusTag.vue'
import LoadingEmpty from './LoadingEmpty.vue'

export {
  StatusTag,
  LoadingEmpty
}

export default {
  install(app) {
    app.component('StatusTag', StatusTag)
    app.component('LoadingEmpty', LoadingEmpty)
  }
}
