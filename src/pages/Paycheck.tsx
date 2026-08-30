import {
  GERMAN_STATES,
  MINIJOB_GRENZE,
  MIDIJOB_UPPER,
  computePaycheck,
  type EmploymentType,
  type PaycheckInputs,
  type TaxClass,
} from "../lib/germanTax";
import { usePersistentState } from "../lib/usePersistentState";
import { MonthNav } from "../components/MonthNav";
import { useBudgetData } from "../context/BudgetDataContext";
import { formatMonthLabel } from "../lib/dates";
import "./Paycheck.css";

const DEFAULT_INPUTS: PaycheckInputs = {
  employmentType: "regular",
  payMode: "monthly",
  hourlyRate: 20,
  hoursPerWeek: 38,
  monthlyGross: 3500,
  taxClass: "I",
  stateId: "BE",
  churchTax: false,
  childrenCount: 0,
  under23Childless: false,
  insuranceType: "statutory",
  zusatzbeitrag: 2.9,
  privateMonthlyPremium: 450,
  minijobRvExempt: true,
};

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string; hint: string }[] = [
  { value: "regular", label: "Regular employee", hint: "Standard full/part-time job" },
  { value: "student", label: "Working student", hint: "Werkstudent, ≤20h/week in term" },
  { value: "midijob", label: "Midijob", hint: `€${MINIJOB_GRENZE}–€${MIDIJOB_UPPER}/month` },
  { value: "minijob", label: "Minijob", hint: `Up to €${MINIJOB_GRENZE}/month` },
];

const TAX_CLASSES: { value: TaxClass; label: string; hint: string }[] = [
  { value: "I", label: "I", hint: "Single" },
  { value: "II", label: "II", hint: "Single parent" },
  { value: "III", label: "III", hint: "Married, higher earner" },
  { value: "IV", label: "IV", hint: "Married, similar income" },
  { value: "V", label: "V", hint: "Married, lower earner" },
  { value: "VI", label: "VI", hint: "Second job" },
];

function euro(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function Paycheck() {
  const [inputs, setInputs] = usePersistentState<PaycheckInputs>("calm-budget:paycheck", DEFAULT_INPUTS);
  const { selectedMonth, incomeForSelectedMonth, setIncomeForSelectedMonth } = useBudgetData();
  const monthLabel = formatMonthLabel(selectedMonth);

  function set<K extends keyof PaycheckInputs>(key: K, value: PaycheckInputs[K]) {
    setInputs({ ...inputs, [key]: value });
  }

  const result = computePaycheck(inputs);
  const grossForBar = Math.max(result.grossMonthly, 0.01);
  const netPct = Math.max(0, Math.min(100, (result.netMonthly / grossForBar) * 100));
  const alreadyApplied =
    incomeForSelectedMonth !== undefined && Math.abs(incomeForSelectedMonth - result.netMonthly) < 0.01;

  const isMinijob = inputs.employmentType === "minijob";
  const isStudent = inputs.employmentType === "student";
  // Minijob income tax is a flat rate paid by the employer, so tax class,
  // church tax and health-insurance type are all irrelevant there.
  const showTaxClass = !isMinijob;
  const showLocationChurch = !isMinijob;
  const showChildren = !isMinijob && !isStudent;
  const showHealthInsurance = !isMinijob && !isStudent;

  return (
    <div className="paycheck">
      <header className="paycheck__header">
        <div>
          <h1>Paycheck</h1>
          <p>Estimate take-home pay from your German gross wage — step back to check a past month, or ahead to plan.</p>
        </div>
        <MonthNav />
      </header>

      <section className="card paycheck__section">
        <h2>Employment type</h2>
        <p className="paycheck__hint">Each of these is taxed and insured differently under German law.</p>
        <div className="paycheck__tax-class-grid">
          {EMPLOYMENT_TYPES.map((et) => (
            <button
              key={et.value}
              type="button"
              className={"paycheck__tax-class" + (inputs.employmentType === et.value ? " paycheck__tax-class--active" : "")}
              onClick={() => set("employmentType", et.value)}
              aria-pressed={inputs.employmentType === et.value}
            >
              <strong>{et.label}</strong>
              <span>{et.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card paycheck__section">
        <h2>Your pay</h2>
        <div className="settings-page__options" role="radiogroup" aria-label="How you're paid">
          <button
            type="button"
            role="radio"
            aria-checked={inputs.payMode === "monthly"}
            className={"settings-page__option" + (inputs.payMode === "monthly" ? " settings-page__option--active" : "")}
            onClick={() => set("payMode", "monthly")}
          >
            Monthly salary
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={inputs.payMode === "hourly"}
            className={"settings-page__option" + (inputs.payMode === "hourly" ? " settings-page__option--active" : "")}
            onClick={() => set("payMode", "hourly")}
          >
            Hourly wage
          </button>
        </div>

        {inputs.payMode === "monthly" ? (
          <label className="paycheck__field">
            <span>Gross monthly salary</span>
            <div className="paycheck__input-euro">
              <input
                type="number"
                min={0}
                value={inputs.monthlyGross}
                onChange={(e) => set("monthlyGross", Number(e.target.value))}
              />
              <span>€</span>
            </div>
          </label>
        ) : (
          <div className="paycheck__field-row">
            <label className="paycheck__field">
              <span>Hourly rate</span>
              <div className="paycheck__input-euro">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={inputs.hourlyRate}
                  onChange={(e) => set("hourlyRate", Number(e.target.value))}
                />
                <span>€</span>
              </div>
            </label>
            <label className="paycheck__field">
              <span>Hours per week</span>
              <input
                type="number"
                min={0}
                max={80}
                value={inputs.hoursPerWeek}
                onChange={(e) => set("hoursPerWeek", Number(e.target.value))}
              />
            </label>
          </div>
        )}

        {isMinijob && result.grossMonthly > MINIJOB_GRENZE && (
          <p className="paycheck__notice">
            That's above the €{MINIJOB_GRENZE}/month Minijob limit — try "Midijob" or "Regular employee" instead for an
            accurate estimate.
          </p>
        )}
      </section>

      {isMinijob && (
        <section className="card paycheck__section">
          <h2>Pension insurance</h2>
          <p className="paycheck__hint">
            Minijobs are automatically pension-insured unless you've filed a written exemption request
            (Befreiungsantrag) with your employer — most Minijobbers do, since the extra pension benefit is small.
          </p>
          <label className="settings-page__toggle">
            <input
              type="checkbox"
              checked={inputs.minijobRvExempt}
              onChange={(e) => set("minijobRvExempt", e.target.checked)}
            />
            I've filed a Befreiungsantrag (exempt from pension contributions)
          </label>
        </section>
      )}

      {showTaxClass && (
        <section className="card paycheck__section">
          <h2>Tax class</h2>
          <p className="paycheck__hint">Shown on your Lohnsteuerbescheinigung / ELStAM. Affects how much tax is withheld.</p>
          <div className="paycheck__tax-class-grid">
            {TAX_CLASSES.map((tc) => (
              <button
                key={tc.value}
                type="button"
                className={"paycheck__tax-class" + (inputs.taxClass === tc.value ? " paycheck__tax-class--active" : "")}
                onClick={() => set("taxClass", tc.value)}
                aria-pressed={inputs.taxClass === tc.value}
              >
                <strong>{tc.label}</strong>
                <span>{tc.hint}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {showLocationChurch && (
        <section className="card paycheck__section">
          <h2>Location & church tax</h2>
          <label className="paycheck__field">
            <span>State (Bundesland)</span>
            <select value={inputs.stateId} onChange={(e) => set("stateId", e.target.value)}>
              {GERMAN_STATES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="settings-page__toggle">
            <input type="checkbox" checked={inputs.churchTax} onChange={(e) => set("churchTax", e.target.checked)} />
            I pay church tax (Kirchensteuer)
          </label>
        </section>
      )}

      {showChildren && (
        <section className="card paycheck__section">
          <h2>Children</h2>
          <p className="paycheck__hint">Affects long-term care insurance and, for tax class II, your tax-free allowance.</p>
          <label className="paycheck__field paycheck__field--narrow">
            <span>Number of children</span>
            <input
              type="number"
              min={0}
              max={10}
              value={inputs.childrenCount}
              onChange={(e) => set("childrenCount", Math.max(0, Number(e.target.value)))}
            />
          </label>
          {inputs.childrenCount === 0 && (
            <label className="settings-page__toggle">
              <input
                type="checkbox"
                checked={inputs.under23Childless}
                onChange={(e) => set("under23Childless", e.target.checked)}
              />
              I'm under 23 (no childless surcharge yet)
            </label>
          )}
        </section>
      )}

      {showHealthInsurance && (
        <section className="card paycheck__section">
          <h2>Health insurance</h2>
          <div className="settings-page__options" role="radiogroup" aria-label="Health insurance type">
            <button
              type="button"
              role="radio"
              aria-checked={inputs.insuranceType === "statutory"}
              className={"settings-page__option" + (inputs.insuranceType === "statutory" ? " settings-page__option--active" : "")}
              onClick={() => set("insuranceType", "statutory")}
            >
              Statutory (GKV)
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={inputs.insuranceType === "private"}
              className={"settings-page__option" + (inputs.insuranceType === "private" ? " settings-page__option--active" : "")}
              onClick={() => set("insuranceType", "private")}
            >
              Private (PKV)
            </button>
          </div>

          {inputs.insuranceType === "statutory" ? (
            <label className="paycheck__field paycheck__field--narrow">
              <span>Your fund's additional contribution (Zusatzbeitrag)</span>
              <div className="paycheck__input-euro">
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={inputs.zusatzbeitrag}
                  onChange={(e) => set("zusatzbeitrag", Number(e.target.value))}
                />
                <span>%</span>
              </div>
            </label>
          ) : (
            <label className="paycheck__field paycheck__field--narrow">
              <span>Your monthly premium</span>
              <div className="paycheck__input-euro">
                <input
                  type="number"
                  min={0}
                  value={inputs.privateMonthlyPremium}
                  onChange={(e) => set("privateMonthlyPremium", Number(e.target.value))}
                />
                <span>€</span>
              </div>
            </label>
          )}
        </section>
      )}

      {isStudent && (
        <p className="paycheck__notice">
          As a working student you're exempt from health, long-term-care and unemployment insurance contributions —
          but only while you stay at or under 20 hours/week during term. Your own health insurance (family
          co-insurance or the student rate) is arranged separately, outside this payslip.
        </p>
      )}

      <section className="card paycheck__result">
        <p className="paycheck__headline">
          In {monthLabel}, you can expect about <strong>€{euro(result.netMonthly)}</strong> net
          {result.netPerHour !== null && (
            <>
              {" "}
              — roughly <strong>€{euro(result.netPerHour)}</strong> per hour worked
            </>
          )}
          .
        </p>

        <div className="paycheck__apply-row">
          {alreadyApplied ? (
            <span className="paycheck__applied">✓ Applied as {monthLabel}'s income on the Overview</span>
          ) : (
            <button
              type="button"
              className="paycheck__apply-btn"
              onClick={() => setIncomeForSelectedMonth(result.netMonthly)}
            >
              Apply as {monthLabel} income
            </button>
          )}
        </div>

        <div className="paycheck__stackbar" aria-hidden="true">
          <div className="paycheck__stackbar-net" style={{ width: `${netPct}%` }} />
        </div>
        <div className="paycheck__stackbar-legend">
          <span>
            <span className="paycheck__dot paycheck__dot--net" /> Net pay: €{euro(result.netMonthly)}
          </span>
          <span>
            <span className="paycheck__dot paycheck__dot--out" /> Taxes & insurance: €{euro(result.totalDeductionsMonthly)}
          </span>
        </div>

        <h3 className="paycheck__breakdown-title">Where it goes</h3>
        <ul className="paycheck__breakdown">
          {result.lineItems.map((item) => (
            <li key={item.key} className="paycheck__breakdown-row">
              <span className="paycheck__breakdown-label">
                {item.label}
                {item.note && <span className="paycheck__breakdown-note"> — {item.note}</span>}
              </span>
              <div className="paycheck__breakdown-bar-track">
                <div
                  className="paycheck__breakdown-bar-fill"
                  style={{ width: `${Math.min(100, (item.monthlyAmount / grossForBar) * 100)}%` }}
                />
              </div>
              <span className="paycheck__breakdown-amount">€{euro(item.monthlyAmount)}</span>
            </li>
          ))}
        </ul>

        <div className="paycheck__totals">
          <span>Gross</span>
          <strong>€{euro(result.grossMonthly)}</strong>
        </div>
      </section>

      <p className="paycheck__disclaimer">
        This is a planning estimate based on 2026 German tax and social-insurance rules, assuming no other income.
        It doesn't account for everything a real payslip might (e.g. exact Vorsorgepauschale rules, or
        Kinderfreibeträge effects on solidarity/church tax). For anything official, check your payslip or a tax
        advisor.
      </p>
    </div>
  );
}
