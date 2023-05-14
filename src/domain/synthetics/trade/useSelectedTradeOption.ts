import { useLocalStorageSerializeKey } from "lib/localStorage";
import { getByKey } from "lib/objects";
import { useCallback, useEffect, useMemo } from "react";
import { MarketInfo, MarketsInfoData, useMarketsInfo } from "../markets";
import { TradeMode, TradeType } from "./types";
import { AvailableTokenOptions, useAvailableTokenOptions } from "./useAvailableTokenOptions";
import { TradeFlags, useTradeFlags } from "./useTradeFlags";
import { TokenData, TokensData, useAvailableTokensData } from "../tokens";
import { getIsUnwrap, getIsWrap } from "domain/tokens";
import { getSyntheticsTradeOptionsKey } from "config/localStorage";
import { PositionInfo } from "../positions";

export type SelectedTradeOption = {
  tradeType: TradeType;
  tradeMode: TradeMode;
  tradeFlags: TradeFlags;
  isWrapOrUnwrap: boolean;
  fromTokenAddress?: string;
  fromToken?: TokenData;
  toTokenAddress?: string;
  toToken?: TokenData;
  marketAddress?: string;
  marketInfo?: MarketInfo;
  collateralAddress?: string;
  collateralToken?: TokenData;
  avaialbleTradeModes: TradeMode[];
  availableTokensOptions: AvailableTokenOptions;
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  setActivePosition: (position?: PositionInfo) => void;
  setTradeType: (tradeType: TradeType) => void;
  setTradeMode: (tradeMode: TradeMode) => void;
  setFromTokenAddress: (tokenAddress?: string) => void;
  setToTokenAddress: (tokenAddress?: string) => void;
  setMarketAddress: (marketAddress?: string) => void;
  setCollateralAddress: (tokenAddress?: string) => void;
};

type StoredTradeOptions = {
  tradeType: TradeType;
  tradeMode: TradeMode;
  tokens: {
    fromTokenAddress?: string;
    swapToTokenAddress?: string;
    indexTokenAddress?: string;
  };
  markets: {
    [indexTokenAddress: string]: {
      long: string;
      short: string;
    };
  };
  collaterals: {
    [marketAddress: string]: {
      long: string;
      short: string;
    };
  };
};

export function useSelectedTradeOption(chainId: number): SelectedTradeOption {
  const { marketsInfoData } = useMarketsInfo(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  const [storedOptions, setStoredOptions] = useLocalStorageSerializeKey<StoredTradeOptions>(
    getSyntheticsTradeOptionsKey(chainId),
    {
      tradeType: TradeType.Long,
      tradeMode: TradeMode.Market,
      tokens: {},
      markets: {},
      collaterals: {},
    }
  );

  const availableTokensOptions = useAvailableTokenOptions(chainId);
  const { swapTokens, indexTokens } = availableTokensOptions;

  const tradeType = storedOptions?.tradeType;
  const tradeMode = storedOptions?.tradeMode;

  const avaialbleTradeModes = useMemo(() => {
    if (!tradeType) {
      return [];
    }

    return {
      [TradeType.Long]: [TradeMode.Market, TradeMode.Limit, TradeMode.Trigger],
      [TradeType.Short]: [TradeMode.Market, TradeMode.Limit, TradeMode.Trigger],
      [TradeType.Swap]: [TradeMode.Market, TradeMode.Limit],
    }[tradeType];
  }, [tradeType]);

  const tradeFlags = useTradeFlags(tradeType!, tradeMode!);
  const { isSwap, isLong, isPosition } = tradeFlags;

  const fromTokenAddress = storedOptions?.tokens.fromTokenAddress;
  const fromToken = getByKey(tokensData, fromTokenAddress);

  const toTokenAddress = tradeFlags.isSwap
    ? storedOptions!.tokens.swapToTokenAddress
    : storedOptions!.tokens.indexTokenAddress;
  const toToken = getByKey(tokensData, toTokenAddress);

  const isWrapOrUnwrap = Boolean(
    isSwap && fromToken && toToken && (getIsWrap(fromToken, toToken) || getIsUnwrap(fromToken, toToken))
  );

  const marketAddress = toTokenAddress
    ? storedOptions!.markets[toTokenAddress]?.[tradeFlags.isLong ? "long" : "short"]
    : undefined;
  const marketInfo = getByKey(marketsInfoData, marketAddress);

  const collateralAddress = marketAddress
    ? storedOptions!.collaterals[marketAddress]?.[tradeFlags.isLong ? "long" : "short"]
    : undefined;
  const collateralToken = getByKey(tokensData, collateralAddress);

  const setTradeType = useCallback(
    (tradeType: TradeType) => {
      const oldState = JSON.parse(JSON.stringify(storedOptions));
      oldState.tradeType = tradeType;
      setStoredOptions(oldState);
    },
    [setStoredOptions, storedOptions]
  );

  const setTradeMode = useCallback(
    (tradeMode: TradeMode) => {
      const oldState = JSON.parse(JSON.stringify(storedOptions));
      oldState.tradeMode = tradeMode;
      setStoredOptions(oldState);
    },
    [setStoredOptions, storedOptions]
  );

  const setFromTokenAddress = useCallback(
    (tokenAddress?: string) => {
      const oldState = JSON.parse(JSON.stringify(storedOptions));

      oldState.tokens.fromTokenAddress = tokenAddress;
      setStoredOptions(oldState);
    },
    [setStoredOptions, storedOptions]
  );

  const setToTokenAddress = useCallback(
    (tokenAddress?: string) => {
      const oldState = JSON.parse(JSON.stringify(storedOptions));

      if (tradeFlags.isSwap) {
        oldState.tokens.swapToTokenAddress = tokenAddress;
      } else {
        oldState.tokens.indexTokenAddress = tokenAddress;
      }

      setStoredOptions(oldState);
    },
    [setStoredOptions, storedOptions, tradeFlags.isSwap]
  );

  const setMarketAddress = useCallback(
    (marketAddress?: string) => {
      const oldState = JSON.parse(JSON.stringify(storedOptions));
      if (!toTokenAddress) {
        return;
      }

      oldState.markets[toTokenAddress] = oldState.markets[toTokenAddress] || {};

      if (tradeFlags.isLong) {
        oldState.markets[toTokenAddress].long = marketAddress;
      } else {
        oldState.markets[toTokenAddress].short = marketAddress;
      }

      setStoredOptions(oldState);
    },
    [setStoredOptions, storedOptions, toTokenAddress, tradeFlags.isLong]
  );

  const setActivePosition = useCallback(
    (position?: PositionInfo) => {
      if (!position) {
        return;
      }

      const oldState: StoredTradeOptions = JSON.parse(JSON.stringify(storedOptions));

      oldState.tradeType = position.isLong ? TradeType.Long : TradeType.Short;
      oldState.tokens.indexTokenAddress = position.indexToken.address;
      oldState.markets[oldState.tokens.indexTokenAddress] = oldState.markets[oldState.tokens.indexTokenAddress] || {};
      oldState.markets[oldState.tokens.indexTokenAddress][position.isLong ? "long" : "short"] = position.marketAddress;
      oldState.collaterals[position.marketAddress] = oldState.collaterals[position.marketAddress] || {};
      oldState.collaterals[position.marketAddress][position.isLong ? "long" : "short"] =
        position.collateralToken.address;

      setStoredOptions(oldState);
    },
    [setStoredOptions, storedOptions]
  );

  const setCollateralAddress = useCallback(
    (tokenAddress?: string) => {
      const oldState = JSON.parse(JSON.stringify(storedOptions));

      if (!marketAddress) {
        return;
      }

      oldState.collaterals[marketAddress] = oldState.collaterals[marketAddress] || {};

      if (tradeFlags.isLong) {
        oldState.collaterals[marketAddress].long = tokenAddress;
      } else {
        oldState.collaterals[marketAddress].short = tokenAddress;
      }

      setStoredOptions(oldState);
    },
    [marketAddress, setStoredOptions, storedOptions, tradeFlags.isLong]
  );

  useEffect(
    function updateTradeMode() {
      if (tradeType && tradeMode && !avaialbleTradeModes.includes(tradeMode)) {
        setTradeMode(avaialbleTradeModes[0]);
      }
    },
    [tradeType, tradeMode, avaialbleTradeModes, setTradeMode]
  );

  useEffect(
    function updateSwapTokens() {
      if (!isSwap || !swapTokens.length) {
        return;
      }

      const needFromUpdate = !swapTokens.find((t) => t.address === fromTokenAddress);

      if (needFromUpdate) {
        setFromTokenAddress(swapTokens[0].address);
      }

      const needToUpdate = !swapTokens.find((t) => t.address === toTokenAddress);

      if (needToUpdate) {
        setToTokenAddress(swapTokens[0].address);
      }
    },
    [fromTokenAddress, isSwap, setFromTokenAddress, setToTokenAddress, swapTokens, toTokenAddress]
  );

  useEffect(
    function updatePositionTokens() {
      if (!isPosition) {
        return;
      }

      const needFromUpdate = !swapTokens.find((t) => t.address === fromTokenAddress);

      if (needFromUpdate && swapTokens.length) {
        setFromTokenAddress(swapTokens[0].address);
      }

      const needIndexUpdateByAvailableTokens = !indexTokens.find((t) => t.address === toTokenAddress);

      if (needIndexUpdateByAvailableTokens && indexTokens.length) {
        setToTokenAddress(indexTokens[0].address);
      }

      const needCollateralUpdate =
        !collateralAddress ||
        (marketInfo && ![marketInfo.longTokenAddress, marketInfo.shortTokenAddress].includes(collateralAddress));

      if (needCollateralUpdate && marketInfo) {
        setCollateralAddress(isLong ? marketInfo.longTokenAddress : marketInfo.shortTokenAddress);
      }
    },
    [
      collateralAddress,
      fromTokenAddress,
      indexTokens,
      isLong,
      isPosition,
      marketInfo,
      setCollateralAddress,
      setFromTokenAddress,
      setToTokenAddress,
      swapTokens,
      toTokenAddress,
    ]
  );

  return {
    tradeType: tradeType!,
    tradeMode: tradeMode!,
    tradeFlags,
    isWrapOrUnwrap,
    fromTokenAddress,
    fromToken,
    toTokenAddress,
    toToken,
    marketAddress,
    marketInfo,
    collateralAddress,
    collateralToken,
    availableTokensOptions,
    avaialbleTradeModes,
    marketsInfoData,
    tokensData,
    setActivePosition,
    setFromTokenAddress,
    setToTokenAddress,
    setMarketAddress,
    setCollateralAddress,
    setTradeType,
    setTradeMode,
  };
}