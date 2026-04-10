import { HomeViewModel, AppViewModel, NotificationViewModel } from '../viewmodel/AppViewModel'
import { getStatusText, getStatusColor, relativeTime } from '../common/CommonUtil'

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
    // 每次显示时刷新
    this.loadTasks()
    this.loadUnreadCount()
  }

  async loadUnreadCount(): Promise<void> {
    await NotificationViewModel.loadUnreadCount()
    this.unreadCount = AppViewModel.getUnreadCount()
  }

  async loadTasks(): Promise<void> {
    this.loading = true
    const tab = STATUS_TABS[this.currentTab]
    const result = await HomeViewModel.getMyTasks(tab.status, 1, 50)
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
        .justifyContent(FlexAlign.Center)
        .onClick(() => {
          router.pushUrl({ url: 'pages/Notifications' })
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
            .borderBottom({
              width: this.currentTab === index ? 2 : 0,
              color: '#409EFF'
            })
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
      .border({ width: 1, color: '#EBEEF5', position: Position.Top })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F7FA')
  }
}

/**
 * 订单卡片组件
 */
@Component
struct OrderCard {
  @Prop order: ESObject

  build() {
    Column() {
      // 标题行
      Row() {
        Text(this.order.order_no || '')
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor('#303133')
          .layoutWeight(1)

        Text(getStatusText(this.order.status as string))
          .fontSize(12)
          .fontColor(getStatusColor(this.order.status as string))
          .padding({ left: 8, right: 8, top: 4, bottom: 4 })
          .borderRadius(4)
          .backgroundColor(`${getStatusColor(this.order.status as string)}15`)
      }
      .width('100%')

      // 信息行
      Column() {
        Row() {
          Text('客户:')
            .fontSize(13)
            .fontColor('#909399')
            .width(40)
          Text(this.order.customer_name || '-')
            .fontSize(13)
            .fontColor('#606266')
            .layoutWeight(1)
        }
        .width('100%')
        .margin({ bottom: 6 })

        Row() {
          Text('地址:')
            .fontSize(13)
            .fontColor('#909399')
            .width(40)
          Text(this.order.address || '-')
            .fontSize(13)
            .fontColor('#606266')
            .layoutWeight(1)
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
        }
        .width('100%')
        .margin({ bottom: 6 })

        Row() {
          Text('时间:')
            .fontSize(13)
            .fontColor('#909399')
            .width(40)
          Text(relativeTime(this.order.created_at as string))
            .fontSize(13)
            .fontColor('#909399')
            .layoutWeight(1)
        }
        .width('100%')
      }
      .alignItems(VerticalAlign.Top)

      // 操作按钮行
      if (this.order.assignee_name) {
        Text(`负责人: ${this.order.assignee_name}`)
          .fontSize(12)
          .fontColor('#409EFF')
          .margin({ top: 4 })
          .alignSelf(ItemAlign.Start)
      }
    }
    .width('100%')
    .padding(14)
    .backgroundColor('#FFFFFF')
    .borderRadius(8)
    .shadow({ radius: 4, color: '#00000010', offsetY: 2 })
    .onClick(() => {
      if (this.order.id) {
        router.pushUrl({
          url: 'pages/OrderDetail',
          params: { orderId: this.order.id }
        })
      }
    })
  }
}
