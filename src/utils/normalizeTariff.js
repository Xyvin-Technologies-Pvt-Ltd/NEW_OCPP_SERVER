/**
 * Normalize tariff payloads from oxium / EV machine APIs.
 * New: { value, tax, serviceAmount, energyRate }  — energyRate = value × (1+tax)
 * Legacy: { chargingTariff | total, tax } — service fee already baked into rate
 *
 * Billing: totalAmount = energyRate × kWh + serviceAmount (once)
 * When serviceAmount is missing/0, behavior matches production today.
 */

function toNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeTax(tax) {
  const n = toNumber(tax, 0);
  if (n > 1) return n / 100;
  return n;
}

function normalizeTariff(payload = {}) {
  if (!payload || typeof payload !== 'object') return null;

  const taxRaw = payload.tax;
  const tax = taxRaw === undefined || taxRaw === null || taxRaw === '' ? undefined : taxRaw;
  const serviceAmount = toNumber(payload.serviceAmount, 0);

  const valueRaw = payload.value;
  const value =
    valueRaw === undefined || valueRaw === null || valueRaw === ''
      ? undefined
      : toNumber(valueRaw, undefined);

  const energyRateRaw =
    payload.energyRate ??
    payload.chargingTariff ??
    payload.total ??
    payload.chargingTariffTotal;

  if (energyRateRaw === undefined || energyRateRaw === null || energyRateRaw === '') {
    return null;
  }

  const energyRate = toNumber(energyRateRaw, NaN);
  if (!Number.isFinite(energyRate)) return null;

  return {
    energyRate,
    tax,
    serviceAmount,
    value: Number.isFinite(value) ? value : undefined,
    taxDecimal: tax !== undefined ? normalizeTax(tax) : 0,
  };
}

module.exports = { normalizeTariff, normalizeTax, toNumber };
