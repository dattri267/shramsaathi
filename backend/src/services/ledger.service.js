const prisma = require('../config/db');

async function createFairShareLedger(payment) {
  const workerPercent = Number(
    process.env.WORKER_SHARE_PERCENT || 80
  );

  const welfarePercent = Number(
    process.env.WELFARE_SHARE_PERCENT || 10
  );

  const platformPercent = Number(
    process.env.PLATFORM_SHARE_PERCENT || 10
  );

  if (
    workerPercent +
      welfarePercent +
      platformPercent !== 100
  ) {
    throw new Error(
      'Ledger percentages must total 100'
    );
  }

  const amount = Number(payment.amount);

  const workerAmount = Number(
    (amount * workerPercent / 100).toFixed(2)
  );

  const welfareAmount = Number(
    (amount * welfarePercent / 100).toFixed(2)
  );

  const platformAmount = Number(
    (amount * platformPercent / 100).toFixed(2)
  );

  return prisma.$transaction(async (tx) => {

    const existing =
      await tx.fair_share_ledger.findMany({
        where: {
          booking_id: payment.booking_id
        }
      });

    if (existing.length > 0) {
      return existing;
    }

    return Promise.all([
      tx.fair_share_ledger.create({
        data: {
          booking_id: payment.booking_id,
          payment_id: payment.id,
          party: 'worker',
          amount: workerAmount,
          percentage: workerPercent,
          status: 'settled',
          settled_at: new Date()
        }
      }),

      tx.fair_share_ledger.create({
        data: {
          booking_id: payment.booking_id,
          payment_id: payment.id,
          party: 'welfare_fund',
          amount: welfareAmount,
          percentage: welfarePercent,
          status: 'settled',
          settled_at: new Date()
        }
      }),

      tx.fair_share_ledger.create({
        data: {
          booking_id: payment.booking_id,
          payment_id: payment.id,
          party: 'platform_ops',
          amount: platformAmount,
          percentage: platformPercent,
          status: 'settled',
          settled_at: new Date()
        }
      })
    ]);
  });
}

module.exports = {
  createFairShareLedger
};