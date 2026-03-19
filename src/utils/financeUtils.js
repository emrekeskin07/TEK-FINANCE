export const toFiniteNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const roundToEight = (value) => Number(toFiniteNumber(value).toFixed(8));

export const calculateWeightedAverageCost = ({ existingAmount, existingCost, newAmount, newCost }) => {
  const safeExistingAmount = toFiniteNumber(existingAmount);
  const safeExistingCost = toFiniteNumber(existingCost);
  const safeNewAmount = toFiniteNumber(newAmount);
  const safeNewCost = toFiniteNumber(newCost);
  const totalAmount = safeExistingAmount + safeNewAmount;

  if (totalAmount <= 0) {
    return safeNewCost;
  }

  const weightedCost = ((safeExistingAmount * safeExistingCost) + (safeNewAmount * safeNewCost)) / totalAmount;
  return Number(weightedCost.toFixed(8));
};

export const calculateMergedAmount = ({ existingAmount, incomingAmount }) => {
  return roundToEight(toFiniteNumber(existingAmount) + toFiniteNumber(incomingAmount));
};

export const calculateSellSummary = ({ sourceAmount, sellAmount, sellPrice }) => {
  const safeSourceAmount = toFiniteNumber(sourceAmount);
  const safeSellAmount = toFiniteNumber(sellAmount);
  const safeSellPrice = toFiniteNumber(sellPrice);

  const proceeds = roundToEight(safeSellAmount * safeSellPrice);
  const remainingAmount = roundToEight(safeSourceAmount - safeSellAmount);

  return {
    proceeds,
    remainingAmount,
  };
};

export const calculateProfitLoss = ({ totalValue, totalCost }) => {
  const safeTotalValue = toFiniteNumber(totalValue);
  const safeTotalCost = toFiniteNumber(totalCost);
  const profit = safeTotalValue - safeTotalCost;

  return {
    profit,
    profitPercent: safeTotalCost > 0 ? (profit / safeTotalCost) * 100 : 0,
  };
};

export const calculateDistributionPercent = ({ amount, total }) => {
  const safeAmount = toFiniteNumber(amount);
  const safeTotal = toFiniteNumber(total);

  if (safeTotal <= 0) {
    return 0;
  }

  return (safeAmount / safeTotal) * 100;
};
