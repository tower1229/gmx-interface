import "./SLTPEntries.scss";
import NumberInput from "components/NumberInput/NumberInput";
import PercentageInput from "components/PercentageInput/PercentageInput";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { FaPlus } from "react-icons/fa";
import cx from "classnames";

const SUGGESTION_PERCENTAGE_LIST = [10, 25, 50, 75, 100];

function SLTPEntries({ entries, updateEntry, addEntry, deleteEntry, canAddEntry }) {
  return (
    <div className="SLTPEntries-wrapper">
      {entries.map((entryData) => {
        return (
          <div key={entryData.id}>
            <div className="SLTPEntry-row" key={entryData.id}>
              <div className={cx("SLTP-price", { "input-error": !!entryData.error })}>
                <NumberInput
                  value={entryData.price}
                  onValueChange={(e) => updateEntry(entryData.id, { price: e.target.value })}
                  placeholder="Price"
                  className="price-input"
                />
                <span className="price-symbol">$</span>
                {entryData.error && (
                  <div className={cx("SLTP-input-error", "Tooltip-popup", "z-index-1001", "center-bottom")}>
                    {entryData.error}
                  </div>
                )}
              </div>
              <div className="SLTP-percentage">
                <PercentageInput
                  defaultValue={0}
                  onChange={(value) => updateEntry(entryData.id, { ...entryData, percentage: value })}
                  suggestions={SUGGESTION_PERCENTAGE_LIST}
                  hideDefaultPlaceholder
                  skipMaxValueCheck
                />
              </div>
              <div className="SLTP-actions">
                <TooltipWithPortal
                  handle={
                    <button className="action-add" disabled={!canAddEntry} onClick={addEntry}>
                      <FaPlus color="#5EC989" />
                    </button>
                  }
                  portalClassName="SLTP-helper-text"
                  handleClassName="mr-xs"
                  position="right-center"
                  renderContent={() => <span>Add Row</span>}
                  openDelay={1500}
                />
                <TooltipWithPortal
                  handle={
                    <button
                      className="action-remove"
                      onClick={() => deleteEntry(entryData.id)}
                      disabled={entries.length === 1}
                    >
                      <FaPlus color="#E74E5D" className="rotate-45" />
                    </button>
                  }
                  portalClassName="SLTP-helper-text"
                  position="right-center"
                  renderContent={() => <span>Remove Row</span>}
                  openDelay={1500}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SLTPEntries;
