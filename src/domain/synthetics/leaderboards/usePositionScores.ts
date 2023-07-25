import { useChainId } from "lib/chains";
import { useTokenRecentPrices } from "../tokens";
import { AccountOpenPosition, PositionScores } from "./types";
import { useOpenPositions } from "./useOpenPositions";
import { BigNumber, utils } from "ethers";
import { getToken } from "config/tokens";
import { getAddress } from "ethers/lib/utils";
import { USD_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";

export function usePositionScores() {
  const { chainId } = useChainId();
  const { pricesData } = useTokenRecentPrices(chainId);
  const openPositions = useOpenPositions(chainId);

  if (openPositions.error) {
    return { data: [], isLoading: false, error: openPositions.error };
  } else if (!pricesData || openPositions.isLoading) {
    return { data: [], isLoading: true, error: null };
  }

  const data: Array<PositionScores> = [];

  for (let i = 0; i < openPositions.data.length; i++) {
    const p: AccountOpenPosition = openPositions.data[i];
    const collateralTokenAddress = utils.getAddress(p.collateralToken);

    if (!(collateralTokenAddress in pricesData)) {
      return { data: [], isLoading: false, error: new Error(`Unable to find price for token ${collateralTokenAddress}`) };
    }

    if (!p.marketData) {
      return { data: [], isLoading: false, error: new Error(`Unable to identify market "${p.market}" in chain id: ${chainId}`) };
    }

    const { longTokenAddress, shortTokenAddress } = p.marketData;
    const longToken = getToken(chainId, utils.getAddress(longTokenAddress));
    const shortToken = getToken(chainId, utils.getAddress(shortTokenAddress));

    const collateralTokenPrices = pricesData[collateralTokenAddress];
    const longTokenPrices = pricesData[utils.getAddress(longTokenAddress)];
    const shortTokenPrices = pricesData[utils.getAddress(shortTokenAddress)];
    const collateralToken = getToken(chainId, getAddress(collateralTokenAddress));
    const usdDecimalPlaces = expandDecimals(1, USD_DECIMALS);
    const collateralDecimalPlaces = expandDecimals(1, collateralToken.decimals + USD_DECIMALS);
    const collateralAmountUsd = p.collateralAmount
      .mul(usdDecimalPlaces)
      .mul(collateralTokenPrices.minPrice)
      .div(collateralDecimalPlaces);

    const value = p.sizeInTokens
      .mul(usdDecimalPlaces)
      .mul(p.isLong ? longTokenPrices.minPrice : shortTokenPrices.maxPrice)
      .div(expandDecimals(1, 18 + USD_DECIMALS));

    const unrealizedPnl = p.isLong ? value.sub(p.sizeInUsd) : p.sizeInUsd.sub(value);

    // if (p.account.toLocaleLowerCase() === "0xde518bd3e2ade6873473eb32cfe4ca75f6d7f44e") {
    // if (p.account.toLocaleLowerCase() === "0xd5fba05de4b2d303d03052e8afbf31a767bd908e") {
    //   const { formatAmount } = require("lib/numbers");
    //   console.log({
    //     isLong: p.isLong,
    //     sizeInTokens: formatAmount(p.sizeInTokens, 18),
    //     shortTokenPrice: formatAmount(shortTokenPrices.minPrice, USD_DECIMALS),
    //     longTokenPrice: formatAmount(longTokenPrices.maxPrice, USD_DECIMALS),
    //     value: formatAmount(value, USD_DECIMALS),
    //     collateralToken,
    //     longToken,
    //     shortToken,
    //     collateralAmountUsd: formatAmount(collateralAmountUsd, USD_DECIMALS),
    //     unrealizedPnl: formatAmount(unrealizedPnl, USD_DECIMALS),
    //   });
    // }

    data.push({
      id: p.id,
      account: p.account,
      isLong: p.isLong,
      market: p.market,
      collateralToken: p.collateralToken,
      unrealizedPnl,
      entryPrice: p.entryPrice,
      sizeInUsd: value,
      liqPrice: BigNumber.from(0),
      collateralAmount: p.collateralAmount,
      collateralAmountUsd,
      maxSize: p.maxSize,
    });
  }

  return { data, isLoading: false, error: null };
};
