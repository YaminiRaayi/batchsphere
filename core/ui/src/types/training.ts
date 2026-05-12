export type TrainingType = "SOP" | "GMP" | "DATA_INTEGRITY" | "EHS" | "ROLE_QUALIFICATION" | "OTHER";
export type TrainingAssignmentStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "CANCELLED";

export type TrainingAssignment = {
  id: string;
  assignmentCode: string;
  employeeId: string;
  employeeCode: string | null;
  employeeName: string | null;
  employeeDepartment: string | null;
  employeeJobTitle: string | null;
  assignedUsername: string;
  trainingTitle: string;
  trainingType: TrainingType;
  documentId: string | null;
  revisionId: string | null;
  documentNumber: string | null;
  documentRevision: string | null;
  requiredRole: string | null;
  status: TrainingAssignmentStatus;
  dueDate: string | null;
  completedAt: string | null;
  completedBy: string | null;
  completionComments: string | null;
  assignedBy: string;
  assignedAt: string;
  isActive: boolean;
};

export type CreateTrainingAssignmentRequest = {
  employeeId: string;
  assignedUsername: string;
  trainingTitle: string;
  trainingType: TrainingType;
  documentId?: string;
  revisionId?: string;
  requiredRole?: string;
  dueDate?: string;
};

export type CompleteTrainingAssignmentRequest = {
  comments?: string;
};

export type RoleQualificationRequirement = {
  id: string;
  roleName: string;
  trainingTitle: string;
  trainingType: TrainingType;
  documentId: string | null;
  revisionId: string | null;
  documentNumber: string | null;
  documentRevision: string | null;
  recurrenceMonths: number | null;
  isMandatory: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateRoleQualificationRequirementRequest = {
  roleName: string;
  trainingTitle: string;
  trainingType: TrainingType;
  documentId?: string;
  revisionId?: string;
  recurrenceMonths?: number;
  isMandatory?: boolean;
};
