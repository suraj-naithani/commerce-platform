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

