export type MonthlyCount = {
  month: string;
  count: number;
};

export type CapaAgingBuckets = {
  days0to30: number;
  days31to60: number;
  days61to90: number;
  daysOver90: number;
};

export type QmsAnalytics = {
  deviationsByStatus: Record<string, number>;
  deviationsBySeverity: Record<string, number>;
  deviationsBySourceModule: Record<string, number>;
  deviationsByMonth: MonthlyCount[];
  capasByStatus: Record<string, number>;
  overdueCapas: number;
  dueThisWeek: number;
  avgCapaClosureDays: number | null;
  capaAging: CapaAgingBuckets;
  openChangeControls: number;
  pendingCCApprovals: number;
  overdueEffectivenessChecks: number;
  documentsAwaitingReview: number;
  overdueTrainingAssignments: number;
};
