const { calculatePrice } = require('../services/pricing.service');

async function calculateBookingPrice(req, res) {
  try {
    const {
      standardPrice,
      demandRatio,
      floorPrice,
      ceilingPrice
    } = req.body;

    if (
      standardPrice === undefined ||
      floorPrice === undefined ||
      ceilingPrice === undefined
    ) {
      return res.status(400).json({
        error: 'standardPrice, floorPrice and ceilingPrice are required'
      });
    }

    const result = calculatePrice({
      standardPrice: Number(standardPrice),
      demandRatio: demandRatio === undefined ? 1 : Number(demandRatio),
      floorPrice: Number(floorPrice),
      ceilingPrice: Number(ceilingPrice)
    });

    res.json(result);

  } catch (err) {
    console.error(err);

    res.status(400).json({
      error: err.message
    });
  }
}

module.exports = {
  calculateBookingPrice
};