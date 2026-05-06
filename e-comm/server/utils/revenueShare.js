function calculatePlatformFeeCents(orderAmountCents) {
  const amount = Math.max(0, Number(orderAmountCents) || 0);

  if (amount > 10000) return Math.round(amount * 0.1);
  if (amount >= 5000) return Math.round(amount * 0.15);
  return Math.round(amount * 0.2);
}

module.exports = {
  calculateFeeCents: calculatePlatformFeeCents,
};

function calculateFee(amount) {
  const safeAmount = Number(amount);

  if (!Number.isFinite(safeAmount) || safeAmount <= 0) return 0;
  if (safeAmount > 100) return safeAmount * 0.1;
  if (safeAmount >= 50) return safeAmount * 0.15;
  return safeAmount * 0.2;
}

function calculateFeeCents(amountCents) {
  const safeCents = Number(amountCents);
  if (!Number.isFinite(safeCents) || safeCents <= 0) return 0;
  return Math.round(calculateFee(safeCents / 100) * 100);
}

module.exports = {
  calculateFee,
  calculateFeeCents,
};

