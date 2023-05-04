import "./Referrals.css";
import React from "react";
import { useLocalStorage } from "react-use";
import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import { useParams } from "react-router-dom";
import SEO from "components/Common/SEO";
import Tab from "components/Tab/Tab";
import Loader from "components/Common/Loader";
import Footer from "components/Footer/Footer";
import { getPageTitle, isHashZero } from "lib/legacy";
import {
  useReferralsData,
  registerReferralCode,
  useCodeOwner,
  useAffiliateTier,
  useUserReferralCode,
} from "domain/referrals/hooks";
import JoinReferralCode from "components/Referrals/JoinReferralCode";
import AffiliatesStats from "components/Referrals/AffiliatesStats";
import TradersStats from "components/Referrals/TradersStats";
import AddAffiliateCode from "components/Referrals/AddAffiliateCode";
import { deserializeSampleStats, isRecentReferralCodeNotExpired } from "components/Referrals/referralsHelper";
import { ethers } from "ethers";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { REFERRALS_SELECTED_TAB_KEY } from "config/localStorage";
import { useChainId } from "lib/chains";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getIcon } from "config/icons";
import { ReferralCodeStats } from "domain/referrals";

const TRADERS = "Traders";
const AFFILIATES = "Affiliates";
const TAB_OPTIONS = [TRADERS, AFFILIATES];

function Referrals({ connectWallet, setPendingTxns, pendingTxns }) {
  const { active, account: walletAccount, library } = useWeb3React();
  const { account: queryAccount } = useParams<{ account?: string }>();
  let account;
  if (queryAccount && ethers.utils.isAddress(queryAccount)) {
    account = ethers.utils.getAddress(queryAccount);
  } else {
    account = walletAccount;
  }
  const { chainId } = useChainId();
  const [activeTab, setActiveTab] = useLocalStorage(REFERRALS_SELECTED_TAB_KEY, TRADERS);
  const { referralsData, loading } = useReferralsData(chainId, account);

  const [recentlyAddedCodes, setRecentlyAddedCodes] = useLocalStorageSerializeKey<ReferralCodeStats[]>(
    [chainId, "REFERRAL", account],
    [],
    {
      raw: false,
      deserializer: deserializeSampleStats as any,
      serializer: (value) => JSON.stringify(value),
    }
  );

  const { userReferralCode, userReferralCodeString } = useUserReferralCode(library, chainId, account);
  const { codeOwner } = useCodeOwner(library, chainId, account, userReferralCode);
  const { affiliateTier: traderTier } = useAffiliateTier(library, chainId, codeOwner);
  const networkIcon = getIcon(chainId, "network");

  function handleCreateReferralCode(referralCode) {
    return registerReferralCode(chainId, referralCode, library, {
      sentMsg: t`Referral code submitted!`,
      failMsg: t`Referral code creation failed.`,
      pendingTxns,
    });
  }

  function renderAffiliatesTab() {
    const isReferralCodeAvailable =
      referralsData?.codes?.length || recentlyAddedCodes?.filter(isRecentReferralCodeNotExpired).length;
    if (loading) return <Loader />;
    if (isReferralCodeAvailable) {
      return (
        <AffiliatesStats
          referralsData={referralsData}
          handleCreateReferralCode={handleCreateReferralCode}
          setRecentlyAddedCodes={setRecentlyAddedCodes}
          recentlyAddedCodes={recentlyAddedCodes}
          chainId={chainId}
        />
      );
    } else {
      return (
        <AddAffiliateCode
          handleCreateReferralCode={handleCreateReferralCode}
          active={active}
          connectWallet={connectWallet}
          recentlyAddedCodes={recentlyAddedCodes}
          setRecentlyAddedCodes={setRecentlyAddedCodes}
        />
      );
    }
  }

  function renderTradersTab() {
    if (loading) return <Loader />;
    if (isHashZero(userReferralCode) || !account || !userReferralCode) {
      return (
        <JoinReferralCode
          connectWallet={connectWallet}
          active={active}
          setPendingTxns={setPendingTxns}
          pendingTxns={pendingTxns}
        />
      );
    }
    return (
      <TradersStats
        userReferralCodeString={userReferralCodeString}
        chainId={chainId}
        referralsData={referralsData}
        setPendingTxns={setPendingTxns}
        pendingTxns={pendingTxns}
        traderTier={traderTier}
      />
    );
  }
  const TAB_OPTION_LABELS = { [TRADERS]: t`Traders`, [AFFILIATES]: t`Affiliates` };

  return (
    <SEO title={getPageTitle("Referrals")}>
      <div className="default-container page-layout Referrals">
        <div className="section-title-block">
          <div className="section-title-icon" />
          <div className="section-title-content">
            <div className="Page-title">
              <Trans>
                Referrals <img width="24" src={networkIcon} alt="Network Icon" />
              </Trans>
            </div>
            <div className="Page-description">
              <Trans>
                Get fee discounts and earn rebates through the GMX referral program.
                <br />
                For more information, please read the{" "}
                <ExternalLink href="https://gmxio.gitbook.io/gmx/referrals">referral program details</ExternalLink>.
              </Trans>
            </div>
          </div>
        </div>
        <div className="referral-tab-container">
          <Tab
            options={TAB_OPTIONS}
            optionLabels={TAB_OPTION_LABELS}
            option={activeTab}
            setOption={setActiveTab}
            onChange={setActiveTab}
          />
        </div>
        {activeTab === AFFILIATES ? renderAffiliatesTab() : renderTradersTab()}
      </div>
      <Footer />
    </SEO>
  );
}

export default Referrals;