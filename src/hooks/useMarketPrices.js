import { useMarketData } from './useMarketData';

export function useMarketPrices(portfolio) {
  return useMarketData(portfolio);
}
