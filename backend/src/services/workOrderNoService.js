const Tenant = require('../models/Tenant');
const WorkOrder = require('../models/WorkOrder');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Generate a work order number for a given tenant.
 * Format: {prefix}-{year}-{seq}  e.g. GG-2026-0001
 *
 * @param {number} tenantId
 * @returns {Promise<{ work_order_no: string, prefix: string, year: number, seq: number }>}
 */
async function generateWorkOrderNo(tenantId) {
  return sequelize.transaction(async (t) => {
    // 1. Query tenant for prefix
    const tenant = await Tenant.findByPk(tenantId, { transaction: t });
    if (!tenant) {
      throw new Error(`Tenant with id ${tenantId} not found`);
    }

    const prefix = tenant.order_code_prefix || 'GG';
    const year = new Date().getFullYear();

    // 2. Find max seq for this tenant + year from existing work orders
    // Parse work_order_no like "GG-2026-0001" to extract the sequence number
    const workOrders = await WorkOrder.findAll({
      where: {
        tenant_id: tenantId,
        work_order_no: {
          [Op.like]: `${prefix}-${year}-%`,
        },
      },
      attributes: ['work_order_no'],
      transaction: t,
      raw: true,
    });

    let maxSeq = 0;
    const seqPattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
    for (const wo of workOrders) {
      const match = wo.work_order_no.match(seqPattern);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }

    // 3. Increment seq
    const seq = maxSeq + 1;

    // 4. Format to 4-digit string
    const seqStr = String(seq).padStart(4, '0');
    const work_order_no = `${prefix}-${year}-${seqStr}`;

    return { work_order_no, prefix, year, seq };
  });
}

module.exports = { generateWorkOrderNo };
