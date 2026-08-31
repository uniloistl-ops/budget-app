/**
 * German wage-tax & social-insurance estimator for 2026.
 *
 * This follows the real legal formulas (not a rough approximation of
 * brackets), so results should track an actual payslip closely for a
 * standard, single-job, statutorily-insured employee with stable
 * monthly pay. It is still an ESTIMATE — see PAYCHECK_ASSUMPTIONS
 * in Paycheck.tsx for what is simplified and why.
 *
 * Sources (all current as of 2026, cross-checked August 2026):
 * - §32a EStG (income tax tariff) — gesetze-im-internet.de/estg/__32a.html
 * - §39b EStG (wage-tax procedure per tax class) — gesetze-im-internet.de/estg/__39b.html
 * - Sozialversicherungs-Rechengrößen 2026 (Bundeskabinett, 8 Oct 2025)
 * - GKV-Spitzenverband: durchschnittlicher Zusatzbeitrag 2026 = 2.9%
 * - Pflegeversicherung 2026 (Kinderlosenzuschlag, Sachsen-Sonderregelung)
 * - Entlastungsbetrag für Alleinerziehende / Arbeitnehmer-Pauschbetrag 2026
 * - Minijob-Grenze 2026 (§8 SGB IV) = €603/month
 * - Übergangsbereich / Faktor F 2026 (§20 Abs. 2a SGB IV) = 0.6619
 * - Werkstudentenprivileg (§6 Abs. 1 Nr. 3 SGB V et al.): exempt from KV/PV/AV
 *   up to 20h/week during term; RV stays mandatory
 *
 * These numbers change every year (usually 1 Jan). Whoever revisits this
 * file next year should re-verify every constant below.
 */

export const TAX_YEAR = 2026;

export type TaxClass = "I" | "II" | "III" | "IV" | "V" | "VI";

/** Who's being paid, since German law treats several situations quite
 * differently from a standard full-time job. */
export type EmploymentType = "regular" | "student" | "minijob" | "midijob";

// ---------------------------------------------------------------------------
// §32a EStG — Einkommensteuertarif 2026
// ---------------------------------------------------------------------------

const GRUNDFREIBETRAG = 12348;

/** The base ("Grundtarif") formula: annual income tax for a single filer
 * given zu versteuerndes Einkommen (zvE). §32a Abs. 1 EStG, 2026 values. */
function grundtarif(zvE: number): number {
  if (zvE <= GRUNDFREIBETRAG) return 0;
  if (zvE <= 17799) {
    const y = (zvE - 12348) / 10000;
    return Math.floor((914.51 * y + 1400) * y);
  }
  if (zvE <= 69878) {
    const z = (zvE - 17799) / 10000;
    return Math.floor((173.1 * z + 2397) * z + 1034.87);
  }
  if (zvE <= 277825) {
    return Math.floor(0.42 * zvE - 11135.63);
  }
  return Math.floor(0.45 * zvE - 19470.38);
}

/** Annual wage tax for the given tax class, per §39b Abs. 2 EStG. */
function annualLohnsteuer(taxClass: TaxClass, zvE: number): number {
  switch (taxClass) {
    case "I":
    case "II":
    case "IV":
      return grundtarif(zvE);
    case "III":
      // Ehegattensplitting: tax on half the income, doubled.
      return 2 * grundtarif(zvE / 2);
    case "V":
    case "VI":
      // §39b Abs. 2 Satz 7: double the difference between tax on 1.25x
      // and tax on 0.75x the income. Produces the steep class V/VI curve.
      return Math.max(0, 2 * (grundtarif(1.25 * zvE) - grundtarif(0.75 * zvE)));
  }
}

// ---------------------------------------------------------------------------
// Standard deductions applied before the tariff (§39b Abs. 2 Satz 5 EStG)
// ---------------------------------------------------------------------------

const ARBEITNEHMER_PAUSCHBETRAG = 1230; // 2026, unchanged since 2023
const SONDERAUSGABEN_PAUSCHBETRAG = 36; // per single filer, 2026
const ENTLASTUNGSBETRAG_ALLEINERZIEHEND_BASE = 4260; // Steuerklasse II, 1st child, 2026
const ENTLASTUNGSBETRAG_PRO_WEITERES_KIND = 240;

// ---------------------------------------------------------------------------
// Solidaritätszuschlag 2026
// ---------------------------------------------------------------------------

const SOLI_FREIGRENZE_SINGLE = 20350;
const SOLI_FREIGRENZE_SPLITTING = 40700; // Steuerklasse III

function soli(annualTax: number, isSplitting: boolean): number {
  const freigrenze = isSplitting ? SOLI_FREIGRENZE_SPLITTING : SOLI_FREIGRENZE_SINGLE;
  if (annualTax <= freigrenze) return 0;
  // Milderungszone: eases in gradually rather than jumping straight to 5.5%.
  const gleitzone = 0.119 * (annualTax - freigrenze);
  const full = 0.055 * annualTax;
  return Math.min(gleitzone, full);
}

// ---------------------------------------------------------------------------
// Social insurance — 2026 rates & contribution ceilings (Beitragsbemessungsgrenzen)
// ---------------------------------------------------------------------------

const RV_AV_BBG_MONTHLY = 8450; // unified federal ceiling since 2025
const KV_PV_BBG_MONTHLY = 5812.5;

const RV_EMPLOYEE_RATE = 0.093; // Rentenversicherung, half of 18.6%
const AV_EMPLOYEE_RATE = 0.013; // Arbeitslosenversicherung, half of 2.6%
const KV_BASE_EMPLOYEE_RATE = 0.073; // half of the 14.6% general rate

/** Employee-side Pflegeversicherung rate. Saxony has a different
 * employer/employee split (it never dropped a public holiday when PV
 * was introduced in 1995, so employees there carry a larger share). */
function pvEmployeeRate(childrenCount: number, under23AndChildless: boolean, isSachsen: boolean): number {
  if (childrenCount === 0) {
    if (under23AndChildless) return isSachsen ? 0.023 : 0.018; // base rate, no surcharge yet
    return isSachsen ? 0.029 : 0.024; // Kinderlosenzuschlag: +0.6pp
  }
  const nonSachsenTiers = [0.018, 0.0155, 0.013, 0.0105]; // 1, 2, 3, 4+ children
  const sachsenTiers = [0.023, 0.0205, 0.018, 0.0155];
  const tier = Math.min(childrenCount, 4) - 1;
  return isSachsen ? sachsenTiers[tier] : nonSachsenTiers[tier];
}

// ---------------------------------------------------------------------------
// Minijob & Übergangsbereich ("Midijob") — §8, §20 Abs. 2a SGB IV, 2026
// ---------------------------------------------------------------------------

export const MINIJOB_GRENZE = 603; // per month, 2026
export const MIDIJOB_UPPER = 2000; // per month, unchanged since Oct 2022
const MIDIJOB_FAKTOR_F_2026 = 0.6619; // published annually by the BMAS

/** The employee-side social-insurance contributions in the Übergangsbereich
 * are levied on a reduced, sliding "beitragspflichtige Einnahme" rather than
 * the actual wage — it ramps from a low base at the Minijob-Grenze up to the
 * full wage at €2,000, so there's no hard cliff at the Minijob cutoff. */
function midijobReducedBase(grossMonthly: number): number {
  if (grossMonthly <= MINIJOB_GRENZE) return grossMonthly;
  if (grossMonthly >= MIDIJOB_UPPER) return grossMonthly;
  const span = MIDIJOB_UPPER - MINIJOB_GRENZE;
  const f = MIDIJOB_FAKTOR_F_2026;
  return f * MINIJOB_GRENZE + (MIDIJOB_UPPER / span - (MINIJOB_GRENZE / span) * f) * (grossMonthly - MINIJOB_GRENZE);
}

/** A Minijobber has been compulsorily insured in the RV since 2013 (paying
 * the gap between the employer's flat-rate contribution and the full rate,
 * ~3.6%), unless they've filed a written exemption request with their
 * employer — which most do, since the pension benefit is minimal. */
const MINIJOB_RV_EMPLOYEE_RATE = 0.036;

// ---------------------------------------------------------------------------
// German states — church-tax rate + Saxony's special PV split
// ---------------------------------------------------------------------------

export interface GermanState {
  id: string;
  label: string;
  churchTaxRate: number; // 0.08 or 0.09
  isSachsen: boolean;
}

export const GERMAN_STATES: GermanState[] = [
  { id: "BW", label: "Baden-Württemberg", churchTaxRate: 0.08, isSachsen: false },
  { id: "BY", label: "Bayern", churchTaxRate: 0.08, isSachsen: false },
  { id: "BE", label: "Berlin", churchTaxRate: 0.09, isSachsen: false },
  { id: "BB", label: "Brandenburg", churchTaxRate: 0.09, isSachsen: false },
  { id: "HB", label: "Bremen", churchTaxRate: 0.09, isSachsen: false },
  { id: "HH", label: "Hamburg", churchTaxRate: 0.09, isSachsen: false },
  { id: "HE", label: "Hessen", churchTaxRate: 0.09, isSachsen: false },
  { id: "MV", label: "Mecklenburg-Vorpommern", churchTaxRate: 0.09, isSachsen: false },
  { id: "NI", label: "Niedersachsen", churchTaxRate: 0.09, isSachsen: false },
  { id: "NW", label: "Nordrhein-Westfalen", churchTaxRate: 0.09, isSachsen: false },
  { id: "RP", label: "Rheinland-Pfalz", churchTaxRate: 0.09, isSachsen: false },
  { id: "SL", label: "Saarland", churchTaxRate: 0.09, isSachsen: false },
  { id: "SN", label: "Sachsen", churchTaxRate: 0.09, isSachsen: true },
  { id: "ST", label: "Sachsen-Anhalt", churchTaxRate: 0.09, isSachsen: false },
  { id: "SH", label: "Schleswig-Holstein", churchTaxRate: 0.09, isSachsen: false },
  { id: "TH", label: "Thüringen", churchTaxRate: 0.09, isSachsen: false },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PaycheckInputs {
  employmentType: EmploymentType;
  payMode: "hourly" | "monthly" | "yearly";
  hourlyRate: number;
  hoursPerWeek: number;
  /** "weekly" = estimate monthly hours from hoursPerWeek; "exact" = use
   * exactHoursThisMonth directly, for real-world variation (overtime,
   * part weeks, shift work). Only meaningful when payMode === "hourly". */
  hoursEntryMode: "weekly" | "exact";
  exactHoursThisMonth: number;
  monthlyGross: number;
  yearlyGross: number;
  taxClass: TaxClass;
  stateId: string;
  churchTax: boolean;
  childrenCount: number;
  under23Childless: boolean;
  insuranceType: "statutory" | "private";
  zusatzbeitrag: number; // percent, e.g. 2.9
  privateMonthlyPremium: number;
  minijobRvExempt: boolean; // filed a Befreiungsantrag from pension insurance
  /** Whether this pay lands in the month it's for, or the following one —
   * used only by the Paycheck page's "Apply" action, never by the tax math. */
  paymentTiming: "sameMonth" | "nextMonth";
}

export interface PaycheckLineItem {
  key: string;
  label: string;
  monthlyAmount: number;
  note?: string;
}

export interface PaycheckResult {
  grossMonthly: number;
  netMonthly: number;
  netPerHour: number | null;
  lineItems: PaycheckLineItem[];
  totalDeductionsMonthly: number;
}

/** How many hours count toward this month's pay — either the exact figure
 * you worked, or an estimate from a typical week (52 weeks/year ÷ 12
 * months, the standard conversion factor). Shared by the gross calculation
 * and the per-hour figure below, so they can never disagree. */
function monthlyHours(inputs: PaycheckInputs): number {
  return inputs.hoursEntryMode === "exact" ? inputs.exactHoursThisMonth : inputs.hoursPerWeek * (52 / 12);
}

export function computeMonthlyGross(inputs: PaycheckInputs): number {
  switch (inputs.payMode) {
    case "hourly":
      return inputs.hourlyRate * monthlyHours(inputs);
    case "yearly":
      return inputs.yearlyGross / 12;
    case "monthly":
    default:
      return inputs.monthlyGross;
  }
}

export function computePaycheck(inputs: PaycheckInputs): PaycheckResult {
  const state = GERMAN_STATES.find((s) => s.id === inputs.stateId) ?? GERMAN_STATES[0];
  const grossMonthly = computeMonthlyGross(inputs);
  const grossAnnual = grossMonthly * 12;
  const type = inputs.employmentType;
  const isPrivate = inputs.insuranceType === "private";

  // --- Social insurance: employee-side monthly contributions -------------
  let rvMonthly = 0;
  let avMonthly = 0;
  let kvMonthly = 0;
  let pvMonthly = 0;
  let privatePremiumMonthly = 0;

  if (type === "minijob") {
    // Everything else (KV, PV, AV, and the employee's wage tax) is covered
    // by the employer's flat-rate contributions and Pauschsteuer — none of
    // it is deducted from the employee's pay.
    rvMonthly = inputs.minijobRvExempt ? 0 : grossMonthly * MINIJOB_RV_EMPLOYEE_RATE;
  } else if (type === "student") {
    // Werkstudentenprivileg: KV/PV/AV are waived (assuming ≤20h/week in
    // term time); only RV stays mandatory, at the normal rate.
    rvMonthly = Math.min(grossMonthly, RV_AV_BBG_MONTHLY) * RV_EMPLOYEE_RATE;
  } else {
    // "regular" or "midijob": in the Übergangsbereich, contributions are
    // levied on a reduced sliding base instead of the actual wage.
    const contribBase = type === "midijob" ? midijobReducedBase(grossMonthly) : grossMonthly;
    rvMonthly = Math.min(contribBase, RV_AV_BBG_MONTHLY) * RV_EMPLOYEE_RATE;
    avMonthly = Math.min(contribBase, RV_AV_BBG_MONTHLY) * AV_EMPLOYEE_RATE;
    if (isPrivate) {
      privatePremiumMonthly = inputs.privateMonthlyPremium;
    } else {
      const kvEmployeeRate = KV_BASE_EMPLOYEE_RATE + inputs.zusatzbeitrag / 2 / 100;
      kvMonthly = Math.min(contribBase, KV_PV_BBG_MONTHLY) * kvEmployeeRate;
      const pvRate = pvEmployeeRate(inputs.childrenCount, inputs.under23Childless, state.isSachsen);
      pvMonthly = Math.min(contribBase, KV_PV_BBG_MONTHLY) * pvRate;
    }
  }

  // --- Wage tax, solidarity surcharge, church tax -------------------------
  // Minijob pay is taxed via the employer's flat-rate Pauschsteuer, which
  // never touches the employee's net — so none of this applies there.
  let lohnsteuerAnnual = 0;
  let soliAnnual = 0;
  let kirchensteuerAnnual = 0;

  if (type !== "minijob") {
    const isClassVI = inputs.taxClass === "VI";

    // Vorsorgepauschale: the employee's own RV/KV/PV contributions (on
    // whatever base they were actually levied) are deducted from taxable
    // pay before the tariff applies. AV is excluded from this by law.
    const vorsorgepauschaleAnnual = isClassVI
      ? 0
      : (rvMonthly + (isPrivate ? privatePremiumMonthly : kvMonthly + pvMonthly)) * 12;

    let entlastungsbetrag = 0;
    if (inputs.taxClass === "II") {
      const extraChildren = Math.max(0, inputs.childrenCount - 1);
      entlastungsbetrag = ENTLASTUNGSBETRAG_ALLEINERZIEHEND_BASE + extraChildren * ENTLASTUNGSBETRAG_PRO_WEITERES_KIND;
    }

    let zvE: number;
    if (isClassVI) {
      zvE = grossAnnual; // Steuerklasse VI gets none of the standard allowances.
    } else {
      zvE = Math.max(
        0,
        grossAnnual - ARBEITNEHMER_PAUSCHBETRAG - SONDERAUSGABEN_PAUSCHBETRAG - vorsorgepauschaleAnnual - entlastungsbetrag
      );
    }

    lohnsteuerAnnual = annualLohnsteuer(inputs.taxClass, zvE);
    soliAnnual = soli(lohnsteuerAnnual, inputs.taxClass === "III");
    kirchensteuerAnnual = inputs.churchTax ? lohnsteuerAnnual * state.churchTaxRate : 0;
  }

  // --- Line items ----------------------------------------------------------
  const lineItems: PaycheckLineItem[] =
    type === "minijob"
      ? [
          {
            key: "lohnsteuer",
            label: "Income tax",
            monthlyAmount: 0,
            note: "covered by your employer's flat-rate tax",
          },
          {
            key: "rv",
            label: "Pension insurance (RV)",
            monthlyAmount: rvMonthly,
            note: inputs.minijobRvExempt ? "exempt — Befreiungsantrag filed" : undefined,
          },
        ]
      : [
          { key: "lohnsteuer", label: "Income tax (Lohnsteuer)", monthlyAmount: lohnsteuerAnnual / 12 },
          { key: "soli", label: "Solidarity surcharge", monthlyAmount: soliAnnual / 12 },
          ...(inputs.churchTax
            ? [{ key: "kirchensteuer", label: "Church tax", monthlyAmount: kirchensteuerAnnual / 12 }]
            : []),
          { key: "rv", label: "Pension insurance (RV)", monthlyAmount: rvMonthly },
          {
            key: "av",
            label: "Unemployment insurance (AV)",
            monthlyAmount: avMonthly,
            note: type === "student" ? "exempt — working student" : undefined,
          },
          ...(isPrivate
            ? [{ key: "pkv", label: "Private health insurance", monthlyAmount: privatePremiumMonthly }]
            : [
                {
                  key: "kv",
                  label: "Health insurance (KV)",
                  monthlyAmount: kvMonthly,
                  note: type === "student" ? "exempt — working student" : undefined,
                },
                {
                  key: "pv",
                  label: "Long-term care insurance (PV)",
                  monthlyAmount: pvMonthly,
                  note: type === "student" ? "exempt — working student" : undefined,
                },
              ]),
        ];

  const totalDeductionsMonthly = lineItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
  const netMonthly = grossMonthly - totalDeductionsMonthly;

  const hoursThisMonth = monthlyHours(inputs);
  const netPerHour = inputs.payMode === "hourly" && hoursThisMonth > 0 ? netMonthly / hoursThisMonth : null;

  return { grossMonthly, netMonthly, netPerHour, lineItems, totalDeductionsMonthly };
}
