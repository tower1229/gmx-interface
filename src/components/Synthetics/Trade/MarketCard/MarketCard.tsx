import { t } from "@lingui/macro";
import { InfoRow } from "components/InfoRow/InfoRow";
import {
  getMarket,
  getMarketName,
  getOpenInterest,
  getPoolUsd,
  useMarketsData,
  useMarketsPoolsData,
} from "domain/synthetics/markets";
import { useOpenInterestData } from "domain/synthetics/markets/useOpenInterestData";
import { getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";

import { formatUsd } from "lib/numbers";
import "./MarketCard.scss";

export type Props = {
  swapPath?: string[];
  marketAddress?: string;
  toTokenAddress?: string;
  fromTokenAddress?: string;
  indexTokenAddress?: string;
  isLong: boolean;
  isSwap: boolean;
};

export function MarketCard(p: Props) {
  const { chainId } = useChainId();

  const { marketsData } = useMarketsData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { openInterestData } = useOpenInterestData(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  const market = getMarket(marketsData, p.marketAddress || p.swapPath?.[p.swapPath.length - 1]);
  const marketName = getMarketName(marketsData, tokensData, market?.marketTokenAddress);

  const longToken = getTokenData(tokensData, market?.longTokenAddress);
  const shortToken = getTokenData(tokensData, market?.shortTokenAddress);

  const longPoolAmountUsd = getPoolUsd(
    marketsData,
    poolsData,
    tokensData,
    market?.marketTokenAddress,
    market?.longTokenAddress,
    "midPrice"
  );

  const shortPoolAmountUsd = getPoolUsd(
    marketsData,
    poolsData,
    tokensData,
    market?.marketTokenAddress,
    market?.shortTokenAddress,
    "midPrice"
  );

  const openInterest = getOpenInterest(openInterestData, market?.marketTokenAddress);

  function getTitle() {
    if (p.isSwap) {
      const toToken = getTokenData(tokensData, p.toTokenAddress);
      if (toToken) {
        return t`Swap to ${toToken?.symbol}`;
      }

      return t`Swap`;
    }

    const positionTypeText = p.isLong ? t`Long` : t`Short`;
    const indexToken = getTokenData(tokensData, p.indexTokenAddress);

    return t`${positionTypeText} ${indexToken?.symbol}`;
  }

  return (
    <div className="SwapMarketStats App-card">
      <div className="App-card-title">{getTitle()}</div>
      <div className="App-card-divider" />
      <div className="App-card-content">
        <InfoRow className="info-row" label={t`Market`} value={marketName || "..."} />

        {p.isSwap && (
          <>
            <InfoRow
              className="info-row"
              label={t`${longToken?.symbol} Pool Amount`}
              value={longPoolAmountUsd ? formatUsd(longPoolAmountUsd) : "..."}
            />
            <InfoRow
              className="info-row"
              label={t`${shortToken?.symbol} Pool Amount`}
              value={shortPoolAmountUsd ? formatUsd(shortPoolAmountUsd) : "..."}
            />
          </>
        )}

        {!p.isSwap && (
          <>
            <InfoRow
              className="info-row"
              label={t`Long Pool`}
              value={longPoolAmountUsd ? formatUsd(longPoolAmountUsd) : "..."}
            />

            <InfoRow
              className="info-row"
              label={t`Short Pool`}
              value={shortPoolAmountUsd ? formatUsd(shortPoolAmountUsd) : "..."}
            />

            <InfoRow
              className="info-row"
              label={t`Open Interest Long`}
              value={openInterest?.longInterestUsd ? formatUsd(openInterest.longInterestUsd) : "..."}
            />

            <InfoRow
              className="info-row"
              label={t`Open Interest Short`}
              value={openInterest?.shortInterestUsd ? formatUsd(openInterest.shortInterestUsd) : "..."}
            />
          </>
        )}
      </div>
    </div>
  );
}