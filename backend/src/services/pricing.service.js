function calculatePrice({
  standardPrice,
  demandRatio = 1,
  floorPrice,
  ceilingPrice
}) {
  if (standardPrice <= 0) {
    throw new Error('Standard price must be greater than 0');
  }

  if (floorPrice <= 0 || ceilingPrice <= 0) {
    throw new Error('Floor and ceiling must be greater than 0');
  }

  if (floorPrice > ceilingPrice) {
    throw new Error('Floor price cannot be greater than ceiling price');
  }

  /*
   * demandRatio:
   * 1.0 = normal demand
   * >1.0 = high demand
   * <1.0 = low demand
   *
   * Demand affects the price gradually.
   */
  const demandMultiplier = 1 + ((demandRatio - 1) * 0.5);

  const calculatedPrice = standardPrice * demandMultiplier;

  // HARD LIMIT
  const finalPrice = Math.min(
    Math.max(calculatedPrice, floorPrice),
    ceilingPrice
  );

  return {
    standardPrice,
    demandRatio,
    floorPrice,
    ceilingPrice,
    calculatedPrice: Number(calculatedPrice.toFixed(2)),
    finalPrice: Number(finalPrice.toFixed(2))
  };
}

module.exports = {
  calculatePrice
};