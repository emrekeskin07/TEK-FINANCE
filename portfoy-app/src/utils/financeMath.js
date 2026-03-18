import { inflationData, inflationSources } from "../data/inflationData";

const assertFiniteNumber = (value, name) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new Error(`${name} must be a finite number.`);
  }

  return numericValue;
};

const normalizeMonthKey = (month) => String(month).padStart(2, "0");

export const getInflationRatePercent = ({
  year,
  month,
  source = "tuik",
  dataset = inflationData,
} = {}) => {
  const yearKey = String(year);
  const monthKey = normalizeMonthKey(month);
  const normalizedSource = String(source || "").toLowerCase();

  if (!inflationSources.includes(normalizedSource)) {
    throw new Error(`Unsupported inflation source: ${source}`);
  }

  const yearData = dataset?.[yearKey];
  if (!yearData) {
    throw new Error(`Inflation data not found for year: ${yearKey}`);
  }

  const sourceData = yearData?.[normalizedSource];
  const inflationRatePercent = sourceData?.[monthKey];

  if (!Number.isFinite(Number(inflationRatePercent))) {
    throw new Error(
      `Inflation data not found for ${normalizedSource.toUpperCase()} ${yearKey}-${monthKey}`
    );
  }

  return Number(inflationRatePercent);
};

// Real Return = ((1 + nominal) / (1 + inflation) - 1) * 100, inputs in percent.
export const calculateRealReturnPercent = (
  nominalReturnPercent,
  inflationRatePercent
) => {
  const nominal = assertFiniteNumber(nominalReturnPercent, "nominalReturnPercent") / 100;
  const inflation = assertFiniteNumber(inflationRatePercent, "inflationRatePercent") / 100;

  return (((1 + nominal) / (1 + inflation)) - 1) * 100;
};

export const calculatePurchasingPowerChange = ({
  nominalReturnPercent,
  year,
  month,
  source = "tuik",
  dataset = inflationData,
} = {}) => {
  const nominal = assertFiniteNumber(nominalReturnPercent, "nominalReturnPercent");
  const inflationRatePercent = getInflationRatePercent({
    year,
    month,
    source,
    dataset,
  });

  const realReturnPercent = calculateRealReturnPercent(nominal, inflationRatePercent);

  return {
    nominalReturnPercent: nominal,
    inflationRatePercent,
    source: String(source).toLowerCase(),
    year: String(year),
    month: normalizeMonthKey(month),
    realReturnPercent,
    purchasingPowerChangePercent: realReturnPercent,
  };
};

export const getLatestAnnualInflationRate = ({
  source = "enag",
  dataset = inflationData,
} = {}) => {
  const normalizedSource = String(source || "").toLowerCase();

  if (!inflationSources.includes(normalizedSource)) {
    throw new Error(`Unsupported inflation source: ${source}`);
  }

  const yearsDesc = Object.keys(dataset || {}).sort((a, b) => Number(b) - Number(a));

  for (const year of yearsDesc) {
    const explicitAnnual = Number(dataset?.[year]?.annual?.[normalizedSource]);
    if (Number.isFinite(explicitAnnual)) {
      return {
        year,
        source: normalizedSource,
        inflationRatePercent: explicitAnnual,
      };
    }

    const monthlyMap = dataset?.[year]?.[normalizedSource] || {};
    const monthlyValues = Object.values(monthlyMap)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (!monthlyValues.length) {
      continue;
    }

    const annualFactor = monthlyValues.reduce((acc, monthlyRatePercent) => {
      return acc * (1 + (monthlyRatePercent / 100));
    }, 1);

    return {
      year,
      source: normalizedSource,
      inflationRatePercent: (annualFactor - 1) * 100,
    };
  }

  throw new Error(`No annual inflation data found for source: ${normalizedSource}`);
};
