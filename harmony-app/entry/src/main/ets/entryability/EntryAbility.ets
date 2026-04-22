import { UIAbility, Want, AbilityConstant, common } from '@kit.AbilityKit'
import { window } from '@kit.ArkUI'
import { initStorage } from '../common/StorageUtil'
import { HttpUtil } from '../common/HttpUtil'
import { AppViewModel } from '../viewmodel/AppViewModel'

export default class EntryAbility extends UIAbility {
  async onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): Promise<void> {
    console.info('EntryAbility onCreate')
    await initStorage(this.context as common.UIAbilityContext)
    const isLogin: boolean = await AppViewModel.isLoggedIn()
    AppViewModel.setLoggedIn(isLogin)
  }

  onDestroy(): void {
    console.info('EntryAbility onDestroy')
    HttpUtil.destroy()
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    windowStage.loadContent('pages/Login', (_err) => {
      if (_err) {
        console.error('loadContent failed', JSON.stringify(_err))
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
