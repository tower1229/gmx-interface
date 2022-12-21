import { getTokens } from "config/tokens";
import { useChainId } from "lib/chains";
import { useMemo, useRef } from "react";
import { getHistoryBars, getLiveBar } from "./api";

export const supportedResolutions = { 5: "5m", 15: "15m", 60: "1h", 240: "4h", "1D": "1d" };
const timezoneOffset = -new Date().getTimezoneOffset() * 60;

export function getKeyByValue(object, value) {
  return Object.keys(object).find((key) => object[key] === value);
}

const configurationData = {
  supported_resolutions: Object.keys(supportedResolutions),
  supports_marks: false,
  supports_timescale_marks: false,
  supports_time: true,
  reset_cache_timeout: 100,
};

let onResetCache;

export function getOnResetCache() {
  if (onResetCache) {
    return onResetCache;
  }
}

export default function useDatafeed() {
  const { chainId } = useChainId();
  const intervalRef = useRef();
  const activeTicker = useRef();
  return useMemo(() => {
    return {
      onReady: (callback) => {
        setTimeout(() => callback(configurationData));
      },
      resolveSymbol: async (symbolName, onSymbolResolvedCallback) => {
        const symbolInfo = async (symbol) => {
          const stableTokens = getTokens(chainId)
            .filter((t) => t.isStable)
            .map((t) => t.symbol);

          return {
            name: symbol,
            description: symbol + " / USD",
            ticker: symbol,
            session: "24x7",
            minmov: 1,
            pricescale: 100, // 	or 100
            timezone: "UTC",
            has_intraday: true,
            has_daily: true,
            currency_code: "USD",
            chainId: Number(chainId),
            isStable: stableTokens.includes(symbol),
          };
        };
        const symbol = onSymbolResolvedCallback(await symbolInfo(symbolName));

        return symbol;
      },

      getBars: async (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
        const { from, to, firstDataRequest } = periodParams;
        const toWithOffset = to + timezoneOffset;

        if (!supportedResolutions[resolution]) {
          return onErrorCallback("[getBars] Invalid resolution");
        }
        const { ticker, chainId, isStable } = symbolInfo;
        if (activeTicker.current !== ticker) {
          activeTicker.current = ticker;
        }

        try {
          const bars = await getHistoryBars({ chainId, ticker, resolution, isStable, firstDataRequest, to, from });
          const filteredBars = bars.filter((bar) => bar.time >= from * 1000 && bar.time < toWithOffset * 1000);
          if (filteredBars.length > 0) {
            onHistoryCallback(filteredBars, { noData: false });
          } else {
            onHistoryCallback(filteredBars, { noData: true });
          }
        } catch {
          onErrorCallback("Something went wrong!");
        }
      },

      subscribeBars: async (symbolInfo, resolution, onRealtimeCallback, _uid, onResetCacheNeededCallback) => {
        const { chainId, ticker, isStable } = symbolInfo;
        clearInterval(intervalRef.current);
        onResetCache = onResetCacheNeededCallback;

        intervalRef.current = setInterval(function () {
          getLiveBar({ chainId, ticker, resolution, isStable }).then((bar) => {
            if (ticker === activeTicker.current) {
              onRealtimeCallback(bar);
            }
          });
        }, 500);
      },
      unsubscribeBars: () => {
        clearInterval(intervalRef.current);
      },
    };
  }, [chainId, activeTicker]);
}