import type { ProductivityReport, ReportPeriod } from '../../types/models';

export interface IReportService {
  generateReport(period: ReportPeriod, now?: number): ProductivityReport;
}
