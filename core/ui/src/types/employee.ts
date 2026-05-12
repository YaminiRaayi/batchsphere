export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE" | "TERMINATED";

export type EmployeeQualificationStatus = "PENDING" | "QUALIFIED" | "TRAINING_DUE" | "SUSPENDED";

export type Employee = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  department: string;
  site: string | null;
  jobTitle: string;
  managerEmployeeId: string | null;
  managerEmployeeCode: string | null;
  managerName: string | null;
  employmentStatus: EmployeeStatus;
  qualificationStatus: EmployeeQualificationStatus;
  joinedOn: string | null;
  lastTrainingDate: string | null;
  nextTrainingDue: string | null;
  remarks: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type EmployeeRequest = {
  employeeCode: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  department: string;
  site?: string | null;
  jobTitle: string;
  managerEmployeeId?: string | null;
  employmentStatus?: EmployeeStatus;
  qualificationStatus?: EmployeeQualificationStatus;
  joinedOn?: string | null;
  lastTrainingDate?: string | null;
  nextTrainingDue?: string | null;
  remarks?: string | null;
  createdBy?: string;
  updatedBy?: string;
};
