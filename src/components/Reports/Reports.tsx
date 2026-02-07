import { useState } from 'react';
import { FileText, Shield, DollarSign, Users, History } from 'lucide-react';
import { useTranslation, Language } from '../../lib/i18n';
import { TransfersReport } from './TransfersReport';
import { ComplianceReport } from './ComplianceReport';
import { FinancialReport } from './FinancialReport';
import { ClientsReport } from './ClientsReport';
import { AuditLog } from './AuditLog';

interface ReportsProps {
  businessId: string;
  language: Language;
}

type ReportType = 'transfers' | 'compliance' | 'financial' | 'clients' | 'audit';

export function Reports({ businessId, language }: ReportsProps) {
  const { t } = useTranslation(language);
  const [activeReport, setActiveReport] = useState<ReportType>('transfers');

  const reportTypes = [
    {
      id: 'transfers' as ReportType,
      name: t('reports.transfersReport'),
      icon: FileText,
      description: t('reports.transfersReportDesc'),
      color: 'bg-blue-500',
    },
    {
      id: 'compliance' as ReportType,
      name: t('reports.complianceReport'),
      icon: Shield,
      description: t('reports.complianceReportDesc'),
      color: 'bg-green-500',
    },
    {
      id: 'financial' as ReportType,
      name: t('reports.financialReport'),
      icon: DollarSign,
      description: t('reports.financialReportDesc'),
      color: 'bg-emerald-500',
    },
    {
      id: 'clients' as ReportType,
      name: t('reports.clientsReport'),
      icon: Users,
      description: t('reports.clientsReportDesc'),
      color: 'bg-purple-500',
    },
    {
      id: 'audit' as ReportType,
      name: t('reports.auditLog'),
      icon: History,
      description: t('reports.auditLogDesc'),
      color: 'bg-slate-500',
    },
  ];

  const renderReport = () => {
    switch (activeReport) {
      case 'transfers':
        return <TransfersReport businessId={businessId} language={language} />;
      case 'compliance':
        return <ComplianceReport businessId={businessId} language={language} />;
      case 'financial':
        return <FinancialReport businessId={businessId} language={language} />;
      case 'clients':
        return <ClientsReport businessId={businessId} language={language} />;
      case 'audit':
        return <AuditLog businessId={businessId} language={language} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{t('reports.title')}</h1>
        <p className="text-slate-600 mt-1">{t('reports.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          const isActive = activeReport === report.id;

          return (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                isActive
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <div className={`${report.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{report.name}</h3>
              <p className="text-xs text-slate-600">{report.description}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {renderReport()}
      </div>
    </div>
  );
}
