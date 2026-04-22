import { LoginViewModel, AppViewModel, LoginResult } from '../viewmodel/AppViewModel'
import { router } from '@kit.ArkUI'

@Entry
@Component
struct Login {
  @State username: string = ''
  @State password: string = ''
  @State errorMsg: string = ''
  @State isLoading: boolean = false

  aboutToAppear(): void {
    // 已登录直接跳转
    if (AppViewModel.isLoggedIn()) {
      router.replaceUrl({ url: 'pages/Home' })
    }
  }

  async handleLogin() {
    if (!this.username.trim()) {
      this.errorMsg = '请输入用户名'
      return
    }
    if (!this.password) {
      this.errorMsg = '请输入密码'
      return
    }

    this.isLoading = true
    this.errorMsg = ''

    const result: LoginResult = await LoginViewModel.login(this.username.trim(), this.password)
    this.isLoading = false

    if (result.success) {
      router.replaceUrl({ url: 'pages/Home' })
    } else {
      this.errorMsg = result.message
    }
  }

  build() {
    Column() {
      // 顶部留白
      Column() {
        Text('邦和广告')
          .fontSize(28)
          .fontWeight(FontWeight.Bold)
          .fontColor('#303133')
          .margin({ bottom: 8 })

        Text('测量安装派单系统')
          .fontSize(14)
          .fontColor('#909399')
      }
      .width('100%')
      .padding({ top: 0, bottom: 30 })
      .alignItems(HorizontalAlign.Start)
      .padding({ left: 32 })

      // 登录表单
      Column() {
        // 用户名
        Column() {
          TextInput({ placeholder: '用户名', text: this.username })
            .fontSize(16)
            .backgroundColor(Color.Transparent)
            .height(50)
            .onChange((value: string) => {
              this.username = value
            })
        }
        .width('100%')
        .height(52)
        .border({ width: 1, color: '#DCDFE6', radius: 8 })
        .padding({ left: 16, right: 16 })
        .margin({ bottom: 16 })

        // 密码
        Column() {
          TextInput({ placeholder: '密码', text: this.password })
            .type(InputType.Password)
            .fontSize(16)
            .backgroundColor(Color.Transparent)
            .height(50)
            .onChange((value: string) => {
              this.password = value
            })
            .onSubmit(() => {
              this.handleLogin()
            })
        }
        .width('100%')
        .height(52)
        .border({ width: 1, color: '#DCDFE6', radius: 8 })
        .padding({ left: 16, right: 16 })

        // 错误提示
        if (this.errorMsg) {
          Text(this.errorMsg)
            .fontSize(13)
            .fontColor('#F56C6C')
            .width('100%')
            .textAlign(TextAlign.Start)
            .margin({ top: 8 })
        }

        // 登录按钮
        Button(this.isLoading ? '登录中...' : '登 录', { type: ButtonType.Normal })
          .width('100%')
          .height(48)
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .backgroundColor('#409EFF')
          .borderRadius(8)
          .margin({ top: 32 })
          .enabled(!this.isLoading)
          .onClick(() => {
            this.handleLogin()
          })
      }
      .width('100%')
      .padding({ left: 32, right: 32, top: 0 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#FFFFFF')
    .padding({ top: 120 })
    .alignItems(HorizontalAlign.Center)
  }
}
