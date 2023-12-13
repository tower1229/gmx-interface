import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import SpinningLoader from "components/Common/SpinningLoader";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "components/Modal/Modal";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { getContract } from "config/contracts";
import { getNativeToken, getWrappedToken } from "config/tokens";
import {
  useOneClickTradingGenerateSubaccount,
  useOneClickTradingModalOpen,
  useOneClickTradingState,
} from "context/OneClickTradingContext/OneClickTradingContext";
import { useBigNumberState } from "domain/synthetics/common/useBigNumberInput";
import { addSubaccount } from "domain/synthetics/oneClickTrading/addSubaccount";
import { removeSubaccount } from "domain/synthetics/oneClickTrading/removeSubaccount";
import { OneClickTradingParams } from "domain/synthetics/oneClickTrading/types";
import { withdrawFromSubaccount } from "domain/synthetics/oneClickTrading/withdrawFromSubaccount";
import { getNeedTokenApprove, useTokenBalances, useTokensAllowanceData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import copyIcon from "img/ic_copy_20.svg";
import infoIcon from "img/ic_info.svg";
import externalLinkIcon from "img/ic_new_link_20.svg";
import { useChainId } from "lib/chains";
import { getAccountUrl } from "lib/legacy";
import { formatTokenAmount } from "lib/numbers";
import { getByKey } from "lib/objects";
import { shortenAddressOrEns } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useCopyToClipboard } from "react-use";
import "./OneClickTradingModal.scss";
import { getValidationError } from "./utils";

const defaults: Readonly<OneClickTradingParams> = {
  initialTopUp: BigNumber.from(1000000000000000),
  maxAutoTopUpAmount: BigNumber.from(1000000000000000),
  wethForAutoTopUps: BigNumber.from(1000000000000000),
  maxAllowedActions: BigNumber.from(20),
};

export function OneClickTradingModal() {
  const [isVisible, setIsVisible] = useOneClickTradingModalOpen();
  const oneClickTradingState = useOneClickTradingState();
  const content = oneClickTradingState.subaccount ? <MainView /> : <OffStateView />;

  return (
    <Modal label="One-Click Trading" isVisible={isVisible} setIsVisible={setIsVisible}>
      <div className="OneClickTrading-modal-content">{content}</div>
    </Modal>
  );
}

const OffStateView = memo(() => {
  const generateSubaccount = useOneClickTradingGenerateSubaccount();
  const onGenerateSubaccountClick = useCallback(() => {
    generateSubaccount();
  }, [generateSubaccount]);

  return (
    <>
      <div className="OneClickTrading-alert">
        <img src={infoIcon} alt="Info Icon" />
        <span>
          Enable <ExternalLink href="#">One-Click Trading</ExternalLink> to reduce signing popups.
        </span>
      </div>
      <Button variant="primary-action" onClick={onGenerateSubaccountClick} className="w-full">
        Generate Subaccount
      </Button>
    </>
  );
});

const MainView = memo(() => {
  const oneClickTradingState = useOneClickTradingState();
  const { chainId } = useChainId();
  const { signer } = useWallet();
  const [state, copyToClipboard] = useCopyToClipboard();
  const [copyStatus, setCopyStatus] = useState<null | string>(null);
  const [copyCounter, setCopyCounter] = useState(0);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [disablingLoading, setDisablingLoading] = useState(false);
  const { account } = useWallet();

  const subaccountUrl = useMemo(
    () => getAccountUrl(chainId, oneClickTradingState.subaccount?.address),
    [chainId, oneClickTradingState.subaccount?.address]
  );

  const handleCopyClick = useCallback(() => {
    if (!oneClickTradingState.subaccount?.address) return;
    setCopyCounter((x) => x + 1);
    copyToClipboard(oneClickTradingState.subaccount?.address);
  }, [copyToClipboard, oneClickTradingState.subaccount?.address]);

  useEffect(() => {
    if (state.error) {
      setCopyStatus("Failed to copy");
    } else if (state.value) {
      setCopyStatus("Copied to clipboard");
    }

    const timeoutId = setTimeout(() => {
      setCopyStatus(null);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [state.error, state.value, copyCounter]);

  const renderSubaccountBalanceTooltipContent = useCallback(() => {
    return "123";
  }, []);

  const handleDisableClick = useCallback(async () => {
    const subaccountAddress = oneClickTradingState.subaccount?.address;

    if (!subaccountAddress) throw new Error("Subaccount address is not set");
    if (!signer) throw new Error("Signer is not set");

    setDisablingLoading(true);

    try {
      await removeSubaccount(chainId, signer, subaccountAddress);
    } finally {
      setDisablingLoading(false);
    }

    oneClickTradingState.clearSubaccount();
  }, [chainId, oneClickTradingState, signer]);

  const mainBalances = useTokenBalances(chainId, account);
  const subBalances = useTokenBalances(chainId, oneClickTradingState.subaccount?.address);

  const wrappedToken = useMemo(() => getWrappedToken(chainId), [chainId]);
  const nativeToken = useMemo(() => getNativeToken(chainId), [chainId]);

  const {
    displayValue: initialTopUpString,
    setDisplayValue: setInitialTopUpString,
    isEmpty: initialTopUpIsEmpty,
    value: initialTopUp,
  } = useBigNumberState(defaults.initialTopUp, nativeToken.decimals, 4);
  const {
    displayValue: maxAutoTopUpAmountString,
    setDisplayValue: setMaxAutoTopUpAmountString,
    isEmpty: maxAutoTopUpAmountIsEmpty,
    value: maxAutoTopUpAmount,
  } = useBigNumberState(defaults.maxAutoTopUpAmount, nativeToken.decimals, 4);
  const {
    displayValue: wethForAutoTopUpsString,
    setDisplayValue: setWethForAutoTopUpsString,
    isEmpty: wethForAutoTopUpsIsEmpty,
    value: wethForAutoTopUps,
  } = useBigNumberState(defaults.wethForAutoTopUps, wrappedToken.decimals, 4);
  const {
    displayValue: maxAllowedActionsString,
    setDisplayValue: setMaxAllowedActionsString,
    isEmpty: maxAllowedActionsIsEmpty,
    value: maxAllowedActions,
  } = useBigNumberState(defaults.maxAllowedActions, 0, 0);

  const handleActiveClick = useCallback(() => {
    const subaccountAddress = oneClickTradingState.subaccount?.address;

    if (!subaccountAddress) throw new Error("Subaccount address is not set");
    if (!signer) throw new Error("Signer is not set");

    addSubaccount(chainId, signer, subaccountAddress, {
      initialTopUp,
      maxAutoTopUpAmount,
      wethForAutoTopUps,
      maxAllowedActions,
    });
  }, [
    chainId,
    initialTopUp,
    maxAllowedActions,
    maxAutoTopUpAmount,
    oneClickTradingState.subaccount?.address,
    signer,
    wethForAutoTopUps,
  ]);

  const validationError = useMemo(
    () =>
      getValidationError({
        initialTopUpIsEmpty,
        maxAutoTopUpAmountIsEmpty,
        wethForAutoTopUpsIsEmpty,
        maxAllowedActionsIsEmpty,
      }),
    [initialTopUpIsEmpty, maxAllowedActionsIsEmpty, maxAutoTopUpAmountIsEmpty, wethForAutoTopUpsIsEmpty]
  );

  const handleWithdrawClick = useCallback(async () => {
    const privateKey = oneClickTradingState.subaccount?.privateKey;

    if (!privateKey) throw new Error("Subaccount private key is not set");
    if (!account) throw new Error("Account is not set");

    setWithdrawalLoading(true);
    try {
      await withdrawFromSubaccount({
        chainId,
        // FIXME
        amount: BigNumber.from(123),
        mainAccountAddress: account,
        privateKey,
      });
    } finally {
      setWithdrawalLoading(false);
    }
  }, [account, chainId, oneClickTradingState.subaccount?.privateKey]);

  if (!oneClickTradingState.subaccount) {
    return null;
  }

  const { subaccount } = oneClickTradingState;

  const mainWethBalance = getByKey(mainBalances.balancesData, wrappedToken.address);
  const subEthBalance = getByKey(subBalances.balancesData, nativeToken.address);

  return (
    <div className="OneClickTrading-controls">
      <div className="OneClickTrading-subaccount">
        <div className="OneClickTrading-subaccount-details">
          <span className="OneClickTrading-subaccount-label">
            <Trans>Subaccount:</Trans>
          </span>
          <span>{copyStatus ?? shortenAddressOrEns(subaccount.address, 13)}</span>
        </div>
        <div className="relative">
          <ButtonIcon onClick={handleCopyClick} icon={copyIcon} title="Copy" />
          <ExternalLink href={subaccountUrl}>
            <ButtonIcon icon={externalLinkIcon} title="Open in Explorer" />
          </ExternalLink>
        </div>
      </div>
      <div className="OneClickTrading-buttons">
        <button onClick={handleWithdrawClick} className="OneClickTrading-mini-button">
          {withdrawalLoading ? <SpinningLoader /> : <Trans>Withdraw</Trans>}
        </button>
        <button onClick={handleDisableClick} className="OneClickTrading-mini-button warning">
          {disablingLoading ? <SpinningLoader /> : <Trans>Disable</Trans>}
        </button>
      </div>
      <div className="OneClickTrading-stats">
        <div className="OneClickTrading-section">
          <StatsTooltipRow
            label={t`Subaccount Balance`}
            showColon={false}
            value={
              <TooltipWithPortal
                handle={formatTokenAmount(subEthBalance, nativeToken.decimals, nativeToken.symbol, {
                  displayDecimals: 4,
                })}
                renderContent={renderSubaccountBalanceTooltipContent}
                position="right-bottom"
              />
            }
            showDollar={false}
          />
          <StatsTooltipRow
            label={t`Main Account Balance`}
            showColon={false}
            value={formatTokenAmount(mainWethBalance, wrappedToken.decimals, wrappedToken.symbol, {
              displayDecimals: 4,
            })}
            showDollar={false}
          />
        </div>
        <div className="OneClickTrading-section">
          <InputRow
            value={initialTopUpString}
            setValue={setInitialTopUpString}
            label={t`Initial top up`}
            symbol={nativeToken.symbol}
            tooltipText={t`Initial top up`}
          />
          <InputRow
            value={maxAutoTopUpAmountString}
            setValue={setMaxAutoTopUpAmountString}
            label={t`Max auto top up amount`}
            symbol={nativeToken.symbol}
            tooltipText={t`Max auto top up amount`}
          />
          <InputRow
            value={wethForAutoTopUpsString}
            setValue={setWethForAutoTopUpsString}
            label={t`WETH for auto top ups`}
            symbol={wrappedToken.symbol}
            tooltipText={t`WETH for auto top ups`}
          />
          <InputRow
            value={maxAllowedActionsString}
            setValue={setMaxAllowedActionsString}
            label={t`Max allowed actions`}
            symbol={wrappedToken.symbol}
            tooltipText={t`Max allowed actions`}
          />
        </div>
        <TokenApproval />
        <Button onClick={handleActiveClick} disabled={!!validationError} variant="primary-action" className="w-full">
          {validationError || <Trans>Activate</Trans>}
        </Button>
      </div>
    </div>
  );
});

const ButtonIcon = memo(({ icon, title, onClick }: { icon: string; title: string; onClick?: () => void }) => {
  return (
    <span title={title} className="OneClickTrading-button-icon" onClick={onClick}>
      <img src={icon} alt={title} />
    </span>
  );
});

const TokenApproval = memo(() => {
  const { chainId } = useChainId();
  const wrappedToken = useMemo(() => getWrappedToken(chainId), [chainId]);
  const [modalOpen] = useOneClickTradingModalOpen();

  const { account } = useWallet();

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: [wrappedToken.address],
    skip: !modalOpen,
  });

  const payAmount = BigNumber.from(1);

  const needPayTokenApproval = useMemo(
    () => (tokensAllowanceData ? getNeedTokenApprove(tokensAllowanceData, wrappedToken.address, payAmount) : false),
    [payAmount, tokensAllowanceData, wrappedToken.address]
  );

  if (!needPayTokenApproval || !account) return null;

  return (
    <div className="OneClickTrading-approve-token-btn">
      <ApproveTokenButton
        spenderAddress={account}
        tokenAddress={wrappedToken.address}
        tokenSymbol={wrappedToken.symbol}
      />
    </div>
  );
});

const InputRow = memo(
  ({
    value,
    setValue,
    label,
    symbol,
    tooltipText,
  }: {
    value: string;
    setValue: (value: string) => void;
    label: string;
    symbol: string;
    tooltipText: string;
  }) => {
    const renderTooltipContent = useCallback(() => {
      return tooltipText;
    }, [tooltipText]);

    return (
      <StatsTooltipRow
        showColon={false}
        label={<TooltipWithPortal handle={label} renderContent={renderTooltipContent} position="right-bottom" />}
        value={<Input value={value} setValue={setValue} symbol={symbol} />}
        showDollar={false}
      />
    );
  }
);

const Input = memo(
  ({ value, setValue, symbol }: { value: string; setValue: (value: string) => void; symbol: string }) => {
    const onChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
      },
      [setValue]
    );
    const id = useMemo(() => `input-${Math.random()}`, []);

    return (
      <div className="OneClickTrading-input-wrapper">
        <div className={cx("OneClickTrading-input")}>
          <input onChange={onChange} id={id} value={value} />
          <label htmlFor={id}>
            <span>{symbol}</span>
          </label>
        </div>
      </div>
    );
  }
);
