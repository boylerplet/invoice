import type { FC } from "react"
import type { TerminalProps } from "../../../../contract"

export const Terminal: FC<TerminalProps> = ({ vm }) => (
  <section className="terminal">
    <div className="terminal__left">
      {vm.payment && (
        <div>
          <div className="label">{vm.payment.title}</div>
          <div className="kv">
            {vm.payment.lines.map((line, i) => (
              <div key={i} style={{ display: "contents" }}>
                <div className="kv__label">{line.label}</div>
                <div className="kv__value">{line.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {vm.notes && (
        <div>
          <div className="label">Notes</div>
          <div className="notes">{vm.notes}</div>
        </div>
      )}
    </div>
    <div>
      <div className="totals__row">
        <span className="totals__label">Subtotal</span>
        <span className="totals__value">{vm.subtotal}</span>
      </div>
      {vm.adjustments.map((adj, i) => (
        <div key={i} className="totals__row">
          <span className="totals__label">{adj.label}</span>
          <span className="totals__value">{adj.amount}</span>
        </div>
      ))}
      {vm.tax && (
        <div className="totals__row">
          <span className="totals__label">
            {vm.tax.label} {vm.tax.rate}
          </span>
          <span className="totals__value">{vm.tax.amount}</span>
        </div>
      )}
      <div className="totals__total">
        <span className="totals__total-label">Total</span>
        <span className="totals__total-value">{vm.total}</span>
      </div>
      {vm.paymentTerms && <div className="terms">{vm.paymentTerms}</div>}
    </div>
  </section>
)
