import { Injectable } from '@nestjs/common';

/**
 * Kenya Statutory Calculations
 *
 * Encapsulates all Kenyan payroll statutory rules:
 *  - PAYE (KRA) per Finance Act 2023 bands
 *  - NSSF Act 2013 (tiered to UEL — currently KES 72,000)
 *  - SHIF (Social Health Insurance Fund) — 2.75% of gross, min KES 300
 *  - Affordable Housing Levy — 1.5% employee + 1.5% employer
 *  - NITA — KES 50/employee/month (employer-funded)
 *  - Personal relief — KES 2,400/month
 *  - Insurance relief — 15% of premiums up to KES 5,000/month cap
 *
 * Rates can be overridden by the database (SystemSettings 'payroll.statutory_rates')
 * but defaults reflect current Kenyan law as of mid-2026.
 */

export interface PayeBand {
    upTo: number; // upper bound of this band's monthly taxable pay (KES); use Number.POSITIVE_INFINITY for top band
    rate: number; // decimal e.g. 0.10
}

export interface StatutoryRates {
    paye: {
        bands: PayeBand[];
        personalRelief: number;
        insuranceReliefCap: number; // monthly cap
        insuranceReliefRate: number; // 0.15
        pensionReliefCapMonthly: number; // KES 30,000 (Finance Act 2024)
    };
    nssf: {
        tier1Ceiling: number; // Lower Earnings Limit — currently KES 8,000
        upperEarningsLimit: number; // currently KES 72,000
        employeeRate: number; // 0.06
        employerRate: number; // 0.06
    };
    shif: {
        rate: number; // 0.0275
        minimum: number; // 300
    };
    housingLevy: {
        employeeRate: number; // 0.015
        employerRate: number; // 0.015
    };
    nita: {
        amount: number; // 50 (employer)
    };
}

export const DEFAULT_KENYA_RATES_2026: StatutoryRates = {
    paye: {
        bands: [
            { upTo: 24_000, rate: 0.10 },
            { upTo: 32_333, rate: 0.25 },
            { upTo: 500_000, rate: 0.30 },
            { upTo: 800_000, rate: 0.325 },
            { upTo: Number.POSITIVE_INFINITY, rate: 0.35 },
        ],
        personalRelief: 2_400,
        insuranceReliefCap: 5_000,
        insuranceReliefRate: 0.15,
        pensionReliefCapMonthly: 30_000,
    },
    nssf: {
        tier1Ceiling: 8_000,
        upperEarningsLimit: 72_000,
        employeeRate: 0.06,
        employerRate: 0.06,
    },
    shif: {
        rate: 0.0275,
        minimum: 300,
    },
    housingLevy: {
        employeeRate: 0.015,
        employerRate: 0.015,
    },
    nita: {
        amount: 50,
    },
};

export interface StatutoryCalcInput {
    grossPay: number;
    taxablePay: number; // grossPay minus non-taxable allowances (typically equal to grossPay)
    pensionContribution?: number; // employee's monthly pension contribution (tax-relievable up to cap)
    insurancePremiums?: number; // monthly premiums for insurance relief
}

export interface StatutoryCalcResult {
    nssfEmployee: number;
    nssfEmployer: number;
    shif: number;
    housingLevyEmployee: number;
    housingLevyEmployer: number;
    nitaEmployer: number;
    paye: number;
    personalRelief: number;
    insuranceRelief: number;
    pensionRelief: number;
    payeBeforeReliefs: number;
}

@Injectable()
export class KenyaStatutoryService {
    private rates: StatutoryRates = DEFAULT_KENYA_RATES_2026;

    /** Allow rates to be overridden at runtime (loaded from settings) */
    setRates(rates: Partial<StatutoryRates>): void {
        this.rates = { ...this.rates, ...rates } as StatutoryRates;
    }

    getRates(): StatutoryRates {
        return this.rates;
    }

    /** NSSF Tier I + Tier II contributions (Act of 2013) */
    calcNSSF(grossPay: number): { employee: number; employer: number } {
        const { tier1Ceiling, upperEarningsLimit, employeeRate, employerRate } = this.rates.nssf;
        const pensionablePay = Math.min(grossPay, upperEarningsLimit);
        const employee = round2(pensionablePay * employeeRate);
        const employer = round2(pensionablePay * employerRate);
        return { employee, employer };
        // Note: ceiling kept for future expansion; tier split currently uses combined cap
        void tier1Ceiling;
    }

    /** SHIF (Social Health Insurance Fund) — replaces NHIF since Oct 2024 */
    calcSHIF(grossPay: number): number {
        const v = grossPay * this.rates.shif.rate;
        return round2(Math.max(v, this.rates.shif.minimum));
    }

    /** Affordable Housing Levy — 1.5% employee + 1.5% employer on gross */
    calcHousingLevy(grossPay: number): { employee: number; employer: number } {
        return {
            employee: round2(grossPay * this.rates.housingLevy.employeeRate),
            employer: round2(grossPay * this.rates.housingLevy.employerRate),
        };
    }

    /** NITA — flat KES 50/employee/month, employer-funded */
    calcNITA(): number {
        return this.rates.nita.amount;
    }

    /**
     * PAYE calculation with reliefs (Finance Act 2023 bands; Affordable Housing Levy + SHIF are tax-deductible).
     * Returns gross PAYE before reliefs and the applied reliefs separately so the payslip can show them.
     */
    calcPAYE(input: StatutoryCalcInput): StatutoryCalcResult {
        const { grossPay, taxablePay, pensionContribution = 0, insurancePremiums = 0 } = input;

        const nssf = this.calcNSSF(grossPay);
        const shif = this.calcSHIF(grossPay);
        const housing = this.calcHousingLevy(grossPay);
        const nita = this.calcNITA();

        // Deductions that REDUCE the taxable base before PAYE
        const pensionDeductible = Math.min(pensionContribution, this.rates.paye.pensionReliefCapMonthly);
        const taxableAfterPreReliefs = Math.max(
            0,
            taxablePay - nssf.employee - shif - housing.employee - pensionDeductible,
        );

        // Walk PAYE bands
        let remaining = taxableAfterPreReliefs;
        let payeBeforeReliefs = 0;
        let lastBound = 0;
        for (const band of this.rates.paye.bands) {
            if (remaining <= 0) break;
            const bandWidth = band.upTo - lastBound;
            const slice = Math.min(remaining, bandWidth);
            payeBeforeReliefs += slice * band.rate;
            remaining -= slice;
            lastBound = band.upTo;
        }

        const personalRelief = this.rates.paye.personalRelief;
        const insuranceRelief = Math.min(
            insurancePremiums * this.rates.paye.insuranceReliefRate,
            this.rates.paye.insuranceReliefCap,
        );
        const pensionRelief = 0; // already deducted from base — kept here for reporting

        const paye = Math.max(0, payeBeforeReliefs - personalRelief - insuranceRelief);

        return {
            nssfEmployee: nssf.employee,
            nssfEmployer: nssf.employer,
            shif,
            housingLevyEmployee: housing.employee,
            housingLevyEmployer: housing.employer,
            nitaEmployer: nita,
            paye: round2(paye),
            personalRelief: round2(personalRelief),
            insuranceRelief: round2(insuranceRelief),
            pensionRelief: round2(pensionDeductible),
            payeBeforeReliefs: round2(payeBeforeReliefs),
        };
    }
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}
