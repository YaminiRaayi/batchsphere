export type MonitoringPoint = {
  id: string;
  pointCode: string;
  pointName: string;
  monitoringType: string;
  roomId: string | null;
  roomName: string | null;
  locationDescription: string | null;
  unit: string;
  alertLimit: number;
  actionLimit: number;
  lastResult: EmResult | null;
  isActive: boolean;
};

export type EmResult = {
  id: string;
  pointId: string;
  pointCode: string | null;
  pointName: string | null;
  monitoringType: string | null;
  resultValue: number;
  unit: string;
  recordedAt: string;
  recordedBy: string;
  alertBreached: boolean;
  actionBreached: boolean;
  suggestDeviation: boolean;
  linkedDeviationId: string | null;
  breachDismissed: boolean;
  notes: string | null;
  alertLimit: number | null;
  actionLimit: number | null;
};

export type CreateMonitoringPointRequest = {
  pointCode: string;
  pointName: string;
  monitoringType: string;
  roomId?: string;
  locationDescription?: string;
  unit: string;
  alertLimit: number;
  actionLimit: number;
  createdBy?: string;
};

export type RecordEmResultRequest = {
  pointId: string;
  resultValue: number;
  recordedBy?: string;
  notes?: string;
};

export type LinkBreachDeviationRequest = {
  deviationId: string;
  updatedBy?: string;
};

export type DismissBreachRequest = {
  reason: string;
  dismissedBy?: string;
  username: string;
  password: string;
  meaning: string;
};
