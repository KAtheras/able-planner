"use client";

import type { ReactNode } from "react";
import ReportsHeader from "@/components/reports/ReportsHeader";
import type { ReportView } from "@/components/reports/ReportsHeader";
import ChartsPanel from "@/components/reports/ChartsPanel";
import AbleVsTaxablePanel from "@/components/reports/AbleVsTaxablePanel";
import ReportWindowToggle, { type ReportWindowOptionItem } from "@/components/reports/ReportWindowToggle";
import type { TaxableYearRow, YearRow } from "@/lib/amortization";

type Props = {
  reportTitle: string;
  accountGrowthTabLabel: string;
  ableGrowthTabLabel: string;
  taxableGrowthTabLabel: string;
  ableVsTaxableTabLabel: string;
  ableVsTaxablePanelLabels: {
    title: string;
    metricLabel: string;
    ableLabel: string;
    taxableLabel: string;
    naLabel: string;
    rows: {
      startingBalance: string;
      contributions: string;
      withdrawals: string;
      investmentReturns: string;
      federalTaxes: string;
      stateTaxes: string;
      endingBalance: string;
      federalSaversCredit: string;
      stateTaxBenefits: string;
      totalEconomicValue: string;
      totalEconomicBenefit: string;
    };
  };
  reportView: ReportView;
  enabledReportViews: ReportView[];
  onReportViewChange: (view: ReportView) => void;
  reportWindowLabel: string;
  reportWindowOptions: ReportWindowOptionItem[];
  reportActions?: ReactNode;
  languageToggle: ReactNode;
  language: "en" | "es";
  accountGrowthNarrativeParagraphs: string[];
  ableRows: YearRow[];
  taxableRows: TaxableYearRow[];
  placeholderText: string;
};

export default function SummaryView({
  reportTitle,
  accountGrowthTabLabel,
  ableGrowthTabLabel,
  taxableGrowthTabLabel,
  ableVsTaxableTabLabel,
  ableVsTaxablePanelLabels,
  reportView,
  enabledReportViews,
  onReportViewChange,
  reportWindowLabel,
  reportWindowOptions,
  reportActions,
  languageToggle,
  language,
  accountGrowthNarrativeParagraphs,
  ableRows,
  taxableRows,
  placeholderText,
}: Props) {
  void placeholderText;
  return (
    <div className="space-y-2 md:space-y-3">
      <ReportsHeader
        title={reportTitle}
        accountGrowthTabLabel={accountGrowthTabLabel}
        ableGrowthTabLabel={ableGrowthTabLabel}
        taxableGrowthTabLabel={taxableGrowthTabLabel}
        ableVsTaxableTabLabel={ableVsTaxableTabLabel}
        language={language}
        reportView={reportView}
        enabledReportViews={enabledReportViews}
        onReportViewChange={onReportViewChange}
        reportActions={reportActions}
        languageToggle={languageToggle}
      />
      {reportView === "account_growth" ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-400">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {reportTitle}
            </h2>
            <div className="ml-auto">
              <ReportWindowToggle label={reportWindowLabel} options={reportWindowOptions} />
            </div>
          </div>
          <div className="mt-4 space-y-4">
          {accountGrowthNarrativeParagraphs.map((paragraph, index) => (
            <p
              key={`account-growth-narrative-${index}`}
              className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
            >
              {paragraph}
            </p>
          ))}
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {language === "es"
              ? "Puede ver el crecimiento de una cuenta ABLE y una cuenta gravable seleccionando las pestañas ABLE o Gravable en la parte superior. También puede ver una comparación de ambas cuentas."
              : "You can view the account growth of an ABLE and a Taxable investment account by selecting the ABLE or Taxable tabs at the top. You can also see a comparison of the ABLE and Taxable accounts."}
          </p>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {language === "es"
              ? "Por último, puede ver estos resultados en distintos periodos seleccionando el periodo deseado en el botón Ventana de reporte, arriba de cada pestaña de informe."
              : "Lastly, you can view these results across a variety of time periods by selecting the desired time period on the Report Window button above for each of the report tabs."}
          </p>
          </div>
        </div>
      ) : reportView === "tax_benefits" ? (
        <ChartsPanel
          ableRows={ableRows}
          language={language}
          accountType="able"
          reportWindowLabel={reportWindowLabel}
          reportWindowOptions={reportWindowOptions}
        />
      ) : reportView === "taxable_growth" ? (
        <ChartsPanel
          taxableRows={taxableRows}
          language={language}
          accountType="taxable"
          reportWindowLabel={reportWindowLabel}
          reportWindowOptions={reportWindowOptions}
        />
      ) : (
        <AbleVsTaxablePanel
          ableRows={ableRows}
          taxableRows={taxableRows}
          labels={ableVsTaxablePanelLabels}
          language={language}
          reportWindowLabel={reportWindowLabel}
          reportWindowOptions={reportWindowOptions}
        />
      )}
    </div>
  );
}
