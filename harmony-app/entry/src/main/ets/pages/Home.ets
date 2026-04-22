import { HomeViewModel, AppViewModel, NotificationViewModel, TaskResult } from '../viewmodel/AppViewModel'
import { getStatusText, getStatusColor, relativeTime } from '../common/CommonUtil'
import { router } from '@kit.ArkUI'

// 状态筛选Tab
interface StatusTab {
  label: string
  status: string
}

const STATUS_TABS: StatusTab[] = [
  { label: '全部', status: '' },
  { label: '待审核', status: 'pending_review' },
  { label: '测量中', status: 'measuring' },
  { label: '安装中', status: 'installing' }
]

@Entry
@Component
struct Home {
  @State orderList: ESObject[] = []
  @State loading: boolean = false
  @State currentTab: number = 0
  @State unreadCount: number = 0
  private scrollOffset: number = 0

  aboutToAppear(): void {
    this.loadUnreadCount()
    this.loadTasks()
  }

  onPageShow(): void {
    this.loadTasks()
    this.loadUnreadCount()
  }

  async loadUnreadCount(): Promise<void> {
    await NotificationViewModel.loadUnreadCount()
    this.unreadCount = AppViewModel.getUnreadCount()
  }

  async loadTasks(): Promise<void> {
    this.loading = true
    const tab: StatusTab = STATUS_TABS[this.currentTab]
    const result: TaskResult = await HomeViewModel.getMyTasks(tab.status, 1, 50)
    this.orderList = result.list as ESObject[]
    this.loading = false
  }

  onTabChange(index: number): void {
    this.currentTab = index
    this.loadTasks()
  }

  build() {
    Column() {
      // 顶部导航栏
      Row() {
        Text('我的任务')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor('#303133')
          .layoutWeight(1)

        // 通知图标
        Stack() {
          Text('🔔')
            .fontSize(22)
          if (this.unreadCount > 0) {
            Text(String(this.unreadCount))
              .fontSize(10)
              .fontColor(Color.White)
              .width(16)
              .height(16)
              .textAlign(TextAlign.Center)
              .backgroundColor('#F56C6C')
              .borderRadius(8)
              .position({ x: 12, y: -2 })
          }
        }
        .width(36)
        .height(36)
        .alignContent(Alignment.Center)
        .onClick(() => {
          router.pushUrl({ url: 'pages/Notifications' })
        })

        // 新建订单按钮
        Text('+')
          .fontSize(28)
          .fontColor('#409EFF')
          .width(36)
          .height(36)
          .textAlign(TextAlign.Center)
          .onClick(() => {
            router.pushUrl({ url: 'pages/OrderCreate' })
          })
      }
      .width('100%')
      .height(56)
      .padding({ left: 16, right: 16 })

      // 状态筛选Tab
      Row() {
        ForEach(STATUS_TABS, (tab: StatusTab, index: number) => {
          Text(tab.label)
            .fontSize(14)
            .fontColor(this.currentTab === index ? '#409EFF' : '#909399')
            .fontWeight(this.currentTab === index ? FontWeight.Medium : FontWeight.Normal)
            .padding({ left: 12, right: 12, top: 8, bottom: 8 })
            .onClick(() => {
              this.onTabChange(index)
            })
        }, (tab: StatusTab, index: number) => tab.status + index)
      }
      .width('100%')
      .height(44)
      .padding({ left: 8 })

      // 分割线
      Divider().strokeWidth(0.5).color('#EBEEF5').margin({ left: 16, right: 16 })

      // 任务列表
      if (this.loading) {
        Column() {
          LoadingProgress()
            .width(40)
            .height(40)
            .margin({ top: 60 })
          Text('加载中...')
            .fontSize(14)
            .fontColor('#909399')
            .margin({ top: 12 })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else if (this.orderList.length === 0) {
        Column() {
          Text('暂无任务')
            .fontSize(16)
            .fontColor('#C0C4CC')
            .margin({ bottom: 8 })
          Text('有新的任务会在这里显示')
            .fontSize(13)
            .fontColor('#DCDFE6')
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        List({ space: 8 }) {
          ForEach(this.orderList, (item: ESObject) => {
            ListItem() {
              OrderCard({ order: item })
            }
          }, (item: ESObject) => String(item.id))
        }
        .width('100%')
        .layoutWeight(1)
        .padding({ left: 12, right: 12, top: 8, bottom: 8 })
      }

      // 底部Tab栏
      Row() {
        // 首页
        Column() {
          Text('📋')
            .fontSize(22)
          Text('任务')
            .fontSize(10)
            .fontColor('#409EFF')
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)

        // 地图
        Column() {
          Text('🗺️')
            .fontSize(22)
          Text('地图')
            .fontSize(10)
            .fontColor('#909399')
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
        .onClick(() => {
          router.pushUrl({ url: 'pages/Map' })
        })

        // 我的
        Column() {
          Text('👤')
            .fontSize(22)
          Text('我的')
            .fontSize(10)
            .fontColor('#909399')
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
        .onClick(() => {
          router.pushUrl({ url: 'pages/Mine' })
        })
      }
      .width('100%')
      .height(56)
      .backgroundColor('#FFFFFF')
      .borderWidth({ top: 1 })
      .borderColor('#EBEEF5')
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F7FA')
  }
}

/**
 * 订单卡片组件 - 仿 admin-web 风格
 */
@Component
struct OrderCard {
  @Prop order: ESObject

  build() {
    Row() {
      // 左侧强调色条
      Column()
        .width(4)
        .borderRadius(2)
        .backgroundColor(this.accentColor())
        .margin({ right: 12 })

      // 主内容区
      Column() {
        // 第一行: 订单号 + 状态
        Row() {
          Text(this.order.order_no || '')
            .fontSize(15)
            .fontWeight(FontWeight.Medium)
            .fontColor('#303133')
            .layoutWeight(1)

          // 状态徽标 (圆点+文字)
          Row() {
            Circle({ width: 6, height: 6 })
              .fill(getStatusColor(this.order.status as string))
              .margin({ right: 4 })
            Text(getStatusText(this.order.status as string))
              .fontSize(12)
              .fontColor(getStatusColor(this.order.status as string))
          }
          .padding({ left: 8, right: 12, top: 4, bottom: 4 })
          .backgroundColor(`${getStatusColor(this.order.status as string)}15`)
          .borderRadius(12)
        }
        .width('100%')
        .margin({ bottom: 8 })

        // 第二行: 客户名
        Text(this.order.customer_name || '-')
          .fontSize(14)
          .fontColor('#303133')
          .fontWeight(FontWeight.Medium)
          .width('100%')
          .margin({ bottom: 8 })

        // 第三行: 标签 + 面积 + 地址
        Row() {
          if (this.order.ad_type) {
            Text(this.order.ad_type as string)
              .fontSize(11)
              .fontColor('#909399')
              .padding({ left: 6, right: 6, top: 2, bottom: 2 })
              .border({ width: 0.5, color: '#EBEEF5', radius: 3 })
              .margin({ right: 8 })
          }

          if (this.order.total_area) {
            Text(`${this.order.total_area}m²`)
              .fontSize(12)
              .fontColor('#409EFF')
              .fontWeight(FontWeight.Medium)
              .margin({ right: 8 })
          }

          Text(this.order.address || '-')
            .fontSize(12)
            .fontColor('#909399')
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .layoutWeight(1)
        }
        .width('100%')
        .margin({ bottom: 6 })

        // 第四行: 时间 + 已耗时
        Row() {
          Text(relativeTime(this.order.created_at as string))
            .fontSize(12)
            .fontColor('#C0C4CC')

          Text(`已耗时 ${this.elapsedText()}`)
            .fontSize(12)
            .fontColor('#C0C4CC')
            .margin({ left: 12 })
        }
        .width('100%')
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
    }
    .width('100%')
    .padding({ top: 14, bottom: 14, right: 14 })
    .backgroundColor('#FFFFFF')
    .borderRadius(12)
    .shadow({ radius: 6, color: '#00000008', offsetY: 2 })
    .onClick(() => {
      if (this.order.id) {
        router.pushUrl({
          url: 'pages/OrderDetail',
          params: { orderId: this.order.id }
        })
      }
    })
  }

  private accentColor(): string {
    const s: string = this.order.status as string
    return getStatusColor(s)
  }

  private elapsedText(): string {
    const created: string = this.order.created_at as string
    if (!created) return ''
    const date: Date = new Date(created)
    const now: Date = new Date()
    const diff: number = now.getTime() - date.getTime()
    const hours: number = Math.floor(diff / 3600000)
    const days: number = Math.floor(hours / 24)
    if (days > 0) return `${days}d`
    return `${hours}h`
  }
}
