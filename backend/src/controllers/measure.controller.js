const { Order, MeasureReport, MeasureFace, OrderAdItem, User, AdType, Material, OrderLog } = require('../models')
const response = require('../utils/response')
const { sequelize } = require('../config/database')

// 获取测量报告
exports.getReport = async (req, res) => {
  try {
    const { orderId } = req.params

    const report = await MeasureReport.findOne({
      where: { order_id: orderId },
      include: [
        { model: User, as: 'measurer', attributes: ['id', 'real_name', 'phone'] },
        {
          model: Order,
          as: 'order',
          include: [
            {
              model: OrderAdItem,
              as: 'adItems',
              include: [
                { model: AdType, as: 'adType' },
                {
                  model: MeasureFace,
                  as: 'faces',
                  include: [{ model: Material, as: 'material' }]
                }
              ]
            }
          ]
        }
      ]
    })

    if (!report) {
      return response.notFound(res, '测量报告不存在')
    }

    response.success(res, report)
  } catch (err) {
    response.error(res, err.message, 1, 500)
  }
}
