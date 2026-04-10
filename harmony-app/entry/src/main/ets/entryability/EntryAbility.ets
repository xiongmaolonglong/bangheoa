import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit'
import { window } from '@kit.ArkUI'
import { initStorage } from '../common/StorageUtil'
import { HttpUtil } from '../common/HttpUtil'
import { AppViewModel } from '../viewmodel/AppViewModel'

export default class EntryAbility extends UIAbility {
  async onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): Promise<void> {
    console.info('EntryAbility onCreate')
    // 初始化存储
    await initStorage(this.context)
    // 恢复登录状态
    const isLogin = await AppViewModel.isLoggedIn()
    AppViewModel.setLoggedIn(isLogin)
  }

  onDestroy(): void {
    console.info('EntryAbility onDestroy')
    HttpUtil.destroy()
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    windowStage.loadContent('pages/Login', (err) => {
      if (err.code) {
        console.error('loadContent failed', JSON.stringify(err))
        return
      }
      console.info('loadContent succeed')
    })
  }

  onWindowStageDestroy(): void {
  }

  onForeground(): void {
  }

  onBackground(): void {
  }
}
