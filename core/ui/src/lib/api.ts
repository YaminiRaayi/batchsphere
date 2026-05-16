import type { Batch } from "../types/batch";
import type {
  CreateRetentionSampleRequest,
  DisposeRetentionSampleRequest,
  RetentionSample,
  RetentionSampleSummary,
  RetrieveRetentionSampleRequest
} from "../types/retention-sample";
import type { BusinessUnit, CreateBusinessUnitRequest } from "../types/business-unit";
import type { LoginResponse } from "../types/auth";
import type {
  CreateManagedUserRequest,
  ManagedUser,
  UpdateManagedUserRequest
} from "../types/user-management";
import type { Employee, EmployeeRequest } from "../types/employee";
import type { CreateMoaRequest, Moa } from "../types/moa";
import type { InventoryRecord, InventorySummary, InventoryTransaction } from "../types/inventory";
import type {
  AvailablePallet,
  CreateMaterialLocationRuleRequest,
  CreatePalletRequest,
  CreateRackRequest,
  CreateRoomRequest,
  CreateShelfRequest,
  CreateWarehouseRequest,
  CreateWarehouseZoneRuleRequest,
  MaterialLocationRule,
  Pallet,
  Rack,
  Room,
  Shelf,
  Warehouse,
  WarehouseTreeNode,
  WarehouseZoneRule,
  WmsSummary
} from "../types/location";
import type { CreateMaterialRequest, Material } from "../types/material";
import type { CreateSamplingToolRequest, SamplingTool } from "../types/sampling-tool";
import type {
  CreateSpecRequest,
  DelinkMaterialSpecRequest,
  LinkMaterialSpecRequest,
  MaterialSpecLink,
  RejectRequest,
  ReviewSubmissionRequest,
  Spec,
  SpecParameter,
  SpecParameterRequest
} from "../types/spec";
import type { CreateSupplierRequest, Supplier } from "../types/supplier";
import type {
  CreateVendorMaterialApprovalRequest,
  VendorMaterialApproval,
  VendorMaterialApprovalStatus
} from "../types/vendor-material-approval";
import type {
  CreateGrnRequest,
  CoaReviewRequest,
  Grn,
  GrnContainer,
  GrnLabelPrintData,
  GrnDocument,
  GrnSummary,
  MaterialLabel,
  PageResponse
} from "../types/grn";
import type {
  CompleteQaInvestigationReviewRequest,
  AuditEvent,
  CreateESignatureRequest,
  DestroyRetainedSampleRequest,
  ESignatureRecord,
  CompletePhase1Request,
  CompletePhase2Request,
  EscalateQcInvestigationRequest,
  QcDecisionRequest,
  QcReceiptRequest,
  QcInvestigation,
  QcWorksheetRow,
  OpenQcInvestigationRequest,
  AmendQcWorksheetResultRequest,
  RecordQcWorksheetResultRequest,
  ResolveQcInvestigationRequest,
  ExecuteRetestRequest,
  ExecuteResampleRequest,
  SamplingPlanRequest,
  SamplingRequest,
  SamplingSummary,
  StartQcReviewRequest
} from "../types/sampling";
import type {
  CreateDeviationRequest,
  Deviation,
  DeviationStatusUpdateRequest,
  DeviationSummary,
  UpdateDeviationRequest
} from "../types/deviation";
import type {
  Complaint,
  ComplaintStatusUpdateRequest,
  ComplaintSummary,
  CreateComplaintRequest,
  UpdateComplaintRequest
} from "../types/complaint";
import type {
  Equipment,
  EquipmentSummary,
  QualificationRecord,
  CreateEquipmentRequest,
  UpdateEquipmentRequest,
  CreateQualificationRecordRequest
} from "../types/equipment";
import type {
  Capa,
  CapaAlert,
  CapaApproveRequest,
  CapaAttachment,
  CapaAttachmentStage,
  CapaEffectivenessReviewRequest,
  CapaRejectRequest,
  CapaStatusUpdateRequest,
  CapaSummary,
  CreateCapaRequest,
  ScheduleEffectivenessReviewRequest,
  UpdateCapaRequest
} from "../types/capa";
import type {
  CompleteTrainingAssignmentRequest,
  CreateRoleQualificationRequirementRequest,
  CreateTrainingAssignmentRequest,
  RoleQualificationRequirement,
  TrainingAssignment
} from "../types/training";
import type {
  ControlledDocument,
  ControlledDocumentPage,
  ControlledDocumentStatus,
  ControlledDocumentType,
  CreateControlledDocumentRequest,
  CreateDocumentDistributionRequest,
  DocumentAcknowledgementRequest,
  DocumentApprovalRequest,
  DocumentDistribution,
  DocumentRevision
} from "../types/document-control";
import type {
  CreateVendorBusinessUnitRequest,
  CreateVendorBusinessUnitAuditRequest,
  UpdateVendorBusinessUnitRequest,
  VendorBusinessUnitAudit,
  VendorBusinessUnitDocument,
  VendorBusinessUnit
} from "../types/vendor-business-unit";
import type { CreateVendorRequest, Vendor, VendorApprovalRequest, VendorDocument } from "../types/vendor";
import type {
  RiskAssessment,
  RiskAssessmentSummary,
  RiskItem,
  CreateRiskAssessmentRequest,
  CreateRiskItemRequest,
  AcceptRiskAssessmentRequest
} from "../types/riskAssessment";
import type {
  Apqr,
  ApqrConclusionRequest,
  ApqrPage,
  ApqrStatus,
  ApqrSummaryItem,
  ApproveApqrRequest,
  CreateApqrRequest
} from "../types/apqr";
import type {
  CreateSupplierQualityAgreementRequest,
  SupplierQualityAgreement,
  SupplierQualityAgreementPage,
  SupplierQualityAgreementStatus,
  SupplierQualityAgreementStatusRequest
} from "../types/supplier-quality-agreement";
import type {
  AnalystSignCoaRequest,
  BatchCertificate,
  BatchReleaseStatus,
  CertifyBatchRequest,
  CoaResponse,
  CreateQpBatchReleaseRequest,
  IssueCoaRequest,
  QpBatchRelease,
  QpBatchReleasePage,
  RejectBatchRequest
} from "../types/qp-batch-release";
import type { LotTraceabilityResponse } from "../types/traceability";
import { useAuthStore } from "../stores/authStore";
import { useAppShellStore } from "../stores/appShellStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

let accessToken: string | null = null;
let refreshRequest: Promise<string | null> | null = null;

type ApiErrorResponse = {
  error?: string;
  message?: string;
  details?: string;
  timestamp?: string;
};

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function buildError(response: Response) {
  let details = `Request failed with status ${response.status}`;

  try {
    const data = (await response.json()) as ApiErrorResponse;
    if (data.details) {
      details = data.details;
    } else if (data.message) {
      details = data.message;
    } else if (data.error) {
      details = data.error;
    }
  } catch {
    // Ignore JSON parse failures and fall back to the HTTP status message.
  }

  return new ApiError(response.status, details);
}

function shouldAttemptRefresh(path: string) {
  return path !== "/api/auth/login" && path !== "/api/auth/refresh";
}

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

function clearClientSession() {
  setAccessToken(null);
  useAuthStore.getState().clearSession();
  useAppShellStore.getState().resetCurrentUser();
}

function getAuthHeaders(extraHeaders?: HeadersInit, includeJsonContentType = false): HeadersInit {
  return {
    Accept: "application/json",
    ...(includeJsonContentType ? { "Content-Type": "application/json" } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(extraHeaders ?? {})
  };
}

async function refreshAccessToken() {
  const { refreshToken, tokenType } = useAuthStore.getState();
  if (!refreshToken) {
    clearClientSession();
    redirectToLogin();
    return null;
  }

  if (!refreshRequest) {
    refreshRequest = (async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        clearClientSession();
        redirectToLogin();
        throw await buildError(response);
      }

      const payload = (await response.json()) as LoginResponse;
      setAccessToken(payload.accessToken);
      useAuthStore.getState().setSession({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        tokenType: payload.tokenType ?? tokenType,
        user: payload.user
      });
      return payload.accessToken;
    })().finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
}

async function performRequest(path: string, init: RequestInit, retryAuth = true) {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (response.status === 401 && retryAuth && shouldAttemptRefresh(path)) {
    try {
      const refreshedAccessToken = await refreshAccessToken();
      if (refreshedAccessToken) {
        return fetch(`${API_BASE_URL}${path}`, {
          ...init,
          headers: {
            ...(init.headers ?? {}),
            Authorization: `Bearer ${refreshedAccessToken}`
          }
        });
      }
    } catch {
      // Failed refresh falls through to the original HTTP error below.
    }
  }

  return response;
}

async function requestJson<T>(path: string): Promise<T> {
  const response = await performRequest(path, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  return (await response.json()) as T;
}

async function requestMutation<T>(path: string, init: RequestInit): Promise<T> {
  const response = await performRequest(path, {
    ...init,
    headers: getAuthHeaders(init.headers, true)
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  return (await response.json()) as T;
}

async function requestVoid(path: string, init: RequestInit): Promise<void> {
  const response = await performRequest(path, {
    ...init,
    headers: getAuthHeaders(init.headers, true)
  });

  if (!response.ok) {
    throw await buildError(response);
  }
}

async function requestMultipart<T>(path: string, formData: FormData): Promise<T> {
  const response = await performRequest(path, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  return (await response.json()) as T;
}

async function requestBlob(path: string): Promise<Blob> {
  const response = await performRequest(path, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  return response.blob();
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export async function login(username: string, password: string) {
  return requestMutation<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

export async function verifyTotpLogin(challengeToken: string, code: string) {
  return requestMutation<LoginResponse>("/api/auth/totp/verify", {
    method: "POST",
    body: JSON.stringify({ challengeToken, code })
  });
}

export async function setupTotp() {
  return requestMutation<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }>("/api/auth/totp/setup", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function confirmTotpSetup(code: string) {
  return requestMutation<LoginResponse>("/api/auth/totp/verify", {
    method: "POST",
    body: JSON.stringify({ code })
  });
}

export async function fetchCurrentUser() {
  return requestJson<LoginResponse["user"]>("/api/auth/me");
}

export async function fetchManagedUsers() {
  return requestJson<ManagedUser[]>("/api/auth/users");
}

export async function createManagedUser(payload: CreateManagedUserRequest) {
  return requestMutation<ManagedUser>("/api/auth/users", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateManagedUser(id: string, payload: UpdateManagedUserRequest) {
  return requestMutation<ManagedUser>(`/api/auth/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deactivateManagedUser(id: string) {
  return requestVoid(`/api/auth/users/${id}`, {
    method: "DELETE"
  });
}

export async function unlockManagedUser(id: string) {
  return requestMutation<ManagedUser>(`/api/auth/users/${id}/unlock`, {
    method: "POST"
  });
}

export async function resetManagedUserTotp(id: string) {
  return requestMutation<{ userId: string; username: string; totpEnabled: boolean }>(`/api/auth/users/${id}/totp/reset`, {
    method: "POST"
  });
}

export async function fetchEmployees(includeInactive = false) {
  return requestJson<Employee[]>(`/api/employees?includeInactive=${includeInactive}`);
}

export async function fetchEmployee(id: string) {
  return requestJson<Employee>(`/api/employees/${id}`);
}

export async function createEmployee(payload: EmployeeRequest) {
  return requestMutation<Employee>("/api/employees", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateEmployee(id: string, payload: EmployeeRequest) {
  return requestMutation<Employee>(`/api/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deactivateEmployee(id: string, updatedBy: string) {
  return requestVoid(`/api/employees/${id}?updatedBy=${encodeURIComponent(updatedBy)}`, {
    method: "DELETE"
  });
}

export async function logout() {
  return requestVoid("/api/auth/logout", {
    method: "POST"
  });
}

export async function notifySessionTimeout() {
  return requestVoid("/api/auth/session-timeout", {
    method: "POST"
  });
}

export async function fetchGrns(page = 0, size = 15) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<Grn>>(`/api/grns?${params.toString()}`);
}

export async function fetchVendorGrns(vendorId: string, size = 5) {
  const params = new URLSearchParams({
    page: "0",
    size: String(size),
    sort: "createdAt,desc",
    vendorId
  });
  return requestJson<PageResponse<Grn>>(`/api/grns?${params.toString()}`);
}

export async function createGrn(payload: CreateGrnRequest) {
  return requestMutation<Grn>("/api/grns", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function receiveGrn(id: string, updatedBy: string) {
  return requestMutation<Grn>(`/api/grns/${id}/receive`, {
    method: "POST",
    body: JSON.stringify({ updatedBy })
  });
}

export async function reviewGrnCoa(id: string, payload: CoaReviewRequest) {
  return requestMutation<Grn>(`/api/grns/${id}/coa-review`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function cancelGrn(id: string, updatedBy: string, reason?: string) {
  return requestMutation<Grn>(`/api/grns/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ updatedBy, reason })
  });
}

export async function fetchGrnById(id: string) {
  return requestJson<Grn>(`/api/grns/${id}`);
}

export async function fetchGrnSummary() {
  return requestJson<GrnSummary>("/api/grns/summary");
}

export async function fetchDeviations(page = 0, size = 100) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<Deviation>>(`/api/deviations?${params.toString()}`);
}

export async function fetchDeviation(id: string) {
  return requestJson<Deviation>(`/api/deviations/${id}`);
}

export async function fetchDeviationSummary() {
  return requestJson<DeviationSummary>("/api/deviations/summary");
}

export async function createDeviation(payload: CreateDeviationRequest) {
  return requestMutation<Deviation>("/api/deviations", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateDeviation(id: string, payload: UpdateDeviationRequest) {
  return requestMutation<Deviation>(`/api/deviations/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function updateDeviationStatus(id: string, payload: DeviationStatusUpdateRequest) {
  return requestMutation<Deviation>(`/api/deviations/${id}/status`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function fetchCapas(deviationId?: string, page = 0, size = 100) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  if (deviationId) params.set("deviationId", deviationId);
  return requestJson<PageResponse<Capa>>(`/api/capas?${params.toString()}`);
}

export async function fetchCapa(id: string) {
  return requestJson<Capa>(`/api/capas/${id}`);
}

export async function fetchCapaSummary() {
  return requestJson<CapaSummary>("/api/capas/summary");
}

export async function fetchCapaAlerts() {
  return requestJson<CapaAlert[]>("/api/capas/alerts");
}

export async function createCapa(payload: CreateCapaRequest) {
  return requestMutation<Capa>("/api/capas", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateCapa(id: string, payload: UpdateCapaRequest) {
  return requestMutation<Capa>(`/api/capas/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function updateCapaStatus(id: string, payload: CapaStatusUpdateRequest) {
  return requestMutation<Capa>(`/api/capas/${id}/status`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function submitCapaForApproval(id: string) {
  return requestMutation<Capa>(`/api/capas/${id}/submit-for-approval`, { method: "POST", body: "{}" });
}

export async function approveCapaAction(id: string, payload: CapaApproveRequest) {
  return requestMutation<Capa>(`/api/capas/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function rejectCapaAction(id: string, payload: CapaRejectRequest) {
  return requestMutation<Capa>(`/api/capas/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function scheduleCapaEffectivenessReview(id: string, payload: ScheduleEffectivenessReviewRequest) {
  return requestMutation<Capa>(`/api/capas/${id}/schedule-effectiveness-review`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function reviewCapaEffectiveness(id: string, payload: CapaEffectivenessReviewRequest) {
  return requestMutation<Capa>(`/api/capas/${id}/review-effectiveness`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchCapaAttachments(capaId: string) {
  return requestJson<CapaAttachment[]>(`/api/capas/${capaId}/attachments`);
}

export async function uploadCapaAttachment(capaId: string, stage: CapaAttachmentStage, file: File) {
  const formData = new FormData();
  formData.set("stage", stage);
  formData.set("file", file);
  return requestMultipart<CapaAttachment>(`/api/capas/${capaId}/attachments`, formData);
}

export async function deleteCapaAttachment(capaId: string, attachmentId: string) {
  return requestVoid(`/api/capas/${capaId}/attachments/${attachmentId}`, { method: "DELETE" });
}

export async function fetchCapaAttachmentFile(capaId: string, attachmentId: string) {
  return requestBlob(`/api/capas/${capaId}/attachments/${attachmentId}/file`);
}

export async function reassignCapa(id: string, payload: import("../types/capa").ReassignCapaRequest) {
  return requestMutation<import("../types/capa").Capa>(`/api/capas/${id}/reassign`, {
    method: "POST", body: JSON.stringify(payload),
  });
}

export async function fetchCapaReassignmentHistory(id: string) {
  return requestJson<import("../types/capa").CapaReassignment[]>(`/api/capas/${id}/reassignments`);
}

export async function fetchQmsAnalytics() {
  return requestJson<import("../types/qms-analytics").QmsAnalytics>("/api/qms/analytics");
}

export async function fetchChangeControls(page = 0, size = 50) {
  return requestJson<import("../types/change-control").ChangeControlPage>(
    `/api/change-controls?page=${page}&size=${size}&sort=createdAt,desc`
  );
}

export async function fetchChangeControl(id: string) {
  return requestJson<import("../types/change-control").ChangeControl>(`/api/change-controls/${id}`);
}

export async function createChangeControl(payload: import("../types/change-control").CreateChangeControlRequest) {
  return requestMutation<import("../types/change-control").ChangeControl>("/api/change-controls", {
    method: "POST", body: JSON.stringify(payload),
  });
}

export async function updateChangeControl(id: string, payload: import("../types/change-control").CreateChangeControlRequest) {
  return requestMutation<import("../types/change-control").ChangeControl>(`/api/change-controls/${id}`, {
    method: "PUT", body: JSON.stringify(payload),
  });
}

export async function submitChangeControlForReview(id: string) {
  return requestMutation<import("../types/change-control").ChangeControl>(`/api/change-controls/${id}/submit-for-review`, { method: "POST" });
}

export async function approveChangeControl(id: string, payload: import("../types/change-control").ChangeControlApproveRequest) {
  return requestMutation<import("../types/change-control").ChangeControl>(`/api/change-controls/${id}/approve`, {
    method: "POST", body: JSON.stringify(payload),
  });
}

export async function rejectChangeControl(id: string, reason: string) {
  return requestMutation<import("../types/change-control").ChangeControl>(`/api/change-controls/${id}/reject`, {
    method: "POST", body: JSON.stringify({ reason }),
  });
}

export async function startChangeControlImplementation(id: string) {
  return requestMutation<import("../types/change-control").ChangeControl>(`/api/change-controls/${id}/start-implementation`, { method: "POST" });
}

export async function moveChangeControlToEffectivenessCheck(id: string) {
  return requestMutation<import("../types/change-control").ChangeControl>(`/api/change-controls/${id}/move-to-effectiveness-check`, { method: "POST" });
}

export async function closeChangeControl(id: string, payload: import("../types/change-control").ChangeControlCloseRequest) {
  return requestMutation<import("../types/change-control").ChangeControl>(`/api/change-controls/${id}/close`, {
    method: "POST", body: JSON.stringify(payload),
  });
}

export async function cancelChangeControl(id: string, reason?: string) {
  return requestMutation<import("../types/change-control").ChangeControl>(`/api/change-controls/${id}/cancel`, {
    method: "POST", body: JSON.stringify({ reason }),
  });
}

export async function addChangeControlAffectedEntity(id: string, payload: import("../types/change-control").AddAffectedEntityRequest) {
  return requestMutation<import("../types/change-control").ChangeControlAffectedEntity>(`/api/change-controls/${id}/affected-entities`, {
    method: "POST", body: JSON.stringify(payload),
  });
}

export async function removeChangeControlAffectedEntity(id: string, entityId: string) {
  return requestVoid(`/api/change-controls/${id}/affected-entities/${entityId}`, { method: "DELETE" });
}

export async function addChangeControlTask(id: string, payload: import("../types/change-control").CreateTaskRequest) {
  return requestMutation<import("../types/change-control").ChangeControlTask>(`/api/change-controls/${id}/tasks`, {
    method: "POST", body: JSON.stringify(payload),
  });
}

export async function updateChangeControlTaskStatus(id: string, taskId: string, status: import("../types/change-control").ChangeControlTaskStatus) {
  return requestMutation<import("../types/change-control").ChangeControlTask>(`/api/change-controls/${id}/tasks/${taskId}/status`, {
    method: "PUT", body: JSON.stringify({ status }),
  });
}

export async function removeChangeControlTask(id: string, taskId: string) {
  return requestVoid(`/api/change-controls/${id}/tasks/${taskId}`, { method: "DELETE" });
}

export async function fetchDocuments(filters: {
  type?: ControlledDocumentType | "ALL";
  status?: ControlledDocumentStatus | "ALL";
  search?: string;
  page?: number;
  size?: number;
} = {}) {
  const params = new URLSearchParams({
    page: String(filters.page ?? 0),
    size: String(filters.size ?? 100),
    sort: "createdAt,desc"
  });
  if (filters.type && filters.type !== "ALL") params.set("type", filters.type);
  if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  return requestJson<ControlledDocumentPage>(`/api/documents?${params.toString()}`);
}

export async function fetchDocument(id: string) {
  return requestJson<ControlledDocument>(`/api/documents/${id}`);
}

export async function createDocument(payload: CreateControlledDocumentRequest) {
  return requestMutation<ControlledDocument>("/api/documents", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function createDocumentRevision(id: string, payload: { revision: string; changeSummary: string; file?: File | null }) {
  const formData = new FormData();
  formData.set("revision", payload.revision);
  formData.set("changeSummary", payload.changeSummary);
  if (payload.file) formData.set("file", payload.file);
  return requestMultipart<DocumentRevision>(`/api/documents/${id}/revisions`, formData);
}

export async function submitDocumentRevision(id: string, revisionId: string) {
  return requestMutation<ControlledDocument>(`/api/documents/${id}/revisions/${revisionId}/submit`, {
    method: "POST"
  });
}

export async function approveDocumentRevision(id: string, revisionId: string, payload: DocumentApprovalRequest) {
  return requestMutation<ControlledDocument>(`/api/documents/${id}/revisions/${revisionId}/approvals`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchDocumentDistributions(id: string) {
  return requestJson<DocumentDistribution[]>(`/api/documents/${id}/distributions`);
}

export async function distributeDocumentRevision(id: string, revisionId: string, payload: CreateDocumentDistributionRequest) {
  return requestMutation<DocumentDistribution[]>(`/api/documents/${id}/revisions/${revisionId}/distributions`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchMyDocumentAcknowledgements() {
  return requestJson<DocumentDistribution[]>("/api/documents/my-acknowledgements");
}

export async function fetchDocumentRevisionFile(documentId: string, revisionId: string): Promise<Blob> {
  return requestBlob(`/api/documents/${documentId}/revisions/${revisionId}/file`);
}

export async function fetchDocumentReport(id: string): Promise<Blob> {
  return requestBlob(`/api/documents/${id}/report`);
}

export async function downloadCsvExport(path: string, filename: string) {
  const separator = path.includes("?") ? "&" : "?";
  const blob = await requestBlob(`${path}${separator}format=csv`);
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadPdfReport(path: string, filename: string) {
  const blob = await requestBlob(path);
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function acknowledgeDocumentDistribution(distributionId: string, payload: DocumentAcknowledgementRequest) {
  return requestMutation<DocumentDistribution>(`/api/documents/distributions/${distributionId}/acknowledge`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchDocumentsDueForReview() {
  return requestJson<ControlledDocumentPage>("/api/documents/due-for-review?size=50&sort=nextReviewDate,asc");
}

export async function fetchTrainingAssignments(employeeId?: string) {
  const params = new URLSearchParams();
  if (employeeId) params.set("employeeId", employeeId);
  return requestJson<TrainingAssignment[]>(`/api/training/assignments${params.toString() ? `?${params.toString()}` : ""}`);
}

export async function fetchMyTrainingAssignments() {
  return requestJson<TrainingAssignment[]>("/api/training/my-assignments");
}

export async function createTrainingAssignment(payload: CreateTrainingAssignmentRequest) {
  return requestMutation<TrainingAssignment>("/api/training/assignments", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function completeTrainingAssignment(id: string, payload: CompleteTrainingAssignmentRequest) {
  return requestMutation<TrainingAssignment>(`/api/training/assignments/${id}/complete`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function fetchRoleQualificationRequirements() {
  return requestJson<RoleQualificationRequirement[]>("/api/training/requirements");
}

export async function createRoleQualificationRequirement(payload: CreateRoleQualificationRequirementRequest) {
  return requestMutation<RoleQualificationRequirement>("/api/training/requirements", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchGrnItemContainers(grnItemId: string) {
  return requestJson<GrnContainer[]>(`/api/grns/items/${grnItemId}/containers`);
}

export async function fetchContainerLabels(containerId: string) {
  return requestJson<MaterialLabel[]>(`/api/grns/containers/${containerId}/labels`);
}

export async function fetchGrnDocuments(id: string) {
  return requestJson<GrnDocument[]>(`/api/grns/${id}/documents`);
}

export async function fetchGrnLabels(id: string) {
  return requestJson<MaterialLabel[]>(`/api/grns/${id}/labels`);
}

export async function fetchGrnLabelPrintData(id: string) {
  return requestJson<GrnLabelPrintData>(`/api/grns/${id}/labels/print-data`);
}

export async function uploadGrnDocument(
  grnItemId: string,
  payload: {
    documentName: string;
    documentType: string;
    documentUrl?: string;
    createdBy: string;
    file: File;
  }
) {
  const formData = new FormData();
  formData.set("documentName", payload.documentName);
  formData.set("documentType", payload.documentType);
  if (payload.documentUrl) {
    formData.set("documentUrl", payload.documentUrl);
  }
  formData.set("createdBy", payload.createdBy);
  formData.set("file", payload.file);
  return requestMultipart<GrnDocument>(`/api/grns/items/${grnItemId}/documents`, formData);
}

export async function fetchSuppliers() {
  return requestJson<Supplier[]>("/api/suppliers");
}

export async function createSupplier(payload: CreateSupplierRequest) {
  return requestMutation<Supplier>("/api/suppliers", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateSupplier(id: string, payload: CreateSupplierRequest) {
  return requestMutation<Supplier>(`/api/suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteSupplier(id: string) {
  return requestVoid(`/api/suppliers/${id}`, {
    method: "DELETE"
  });
}

export async function fetchVendors(page = 0, size = 20) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<Vendor>>(`/api/vendors?${params.toString()}`);
}

export async function createVendor(payload: CreateVendorRequest) {
  return requestMutation<Vendor>("/api/vendors", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateVendor(id: string, payload: CreateVendorRequest) {
  return requestMutation<Vendor>(`/api/vendors/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteVendor(id: string) {
  return requestVoid(`/api/vendors/${id}`, {
    method: "DELETE"
  });
}

export async function updateVendorApproval(id: string, payload: VendorApprovalRequest) {
  return requestMutation<Vendor>(`/api/vendors/${id}/approval`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function fetchVendorDocuments(id: string) {
  return requestJson<VendorDocument[]>(`/api/vendors/${id}/documents`);
}

export async function uploadVendorDocument(
  id: string,
  payload: {
    documentTitle: string;
    documentType: string;
    expiryDate?: string;
    file: File;
  }
) {
  const formData = new FormData();
  formData.set("documentTitle", payload.documentTitle);
  formData.set("documentType", payload.documentType);
  if (payload.expiryDate) {
    formData.set("expiryDate", payload.expiryDate);
  }
  formData.set("file", payload.file);
  return requestMultipart<VendorDocument>(`/api/vendors/${id}/documents`, formData);
}

export async function deleteVendorDocument(id: string, documentId: string) {
  return requestVoid(`/api/vendors/${id}/documents/${documentId}`, {
    method: "DELETE"
  });
}

export async function fetchVendorDocumentFile(id: string, documentId: string) {
  return requestBlob(`/api/vendors/${id}/documents/${documentId}/file`);
}

export async function fetchVendorBusinessUnits(page = 0, size = 20, vendorId?: string) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });

  if (vendorId) {
    params.set("vendorId", vendorId);
  }

  return requestJson<PageResponse<VendorBusinessUnit>>(
    `/api/vendor-business-units?${params.toString()}`
  );
}

export async function createVendorBusinessUnit(
  vendorId: string,
  payload: CreateVendorBusinessUnitRequest
) {
  return requestMutation<VendorBusinessUnit>(`/api/vendors/${vendorId}/business-units`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateVendorBusinessUnit(
  vendorId: string,
  id: string,
  payload: UpdateVendorBusinessUnitRequest
) {
  return requestMutation<VendorBusinessUnit>(`/api/vendors/${vendorId}/business-units/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteVendorBusinessUnit(id: string) {
  return requestVoid(`/api/vendor-business-units/${id}`, {
    method: "DELETE"
  });
}

export async function fetchVendorBusinessUnitDocuments(id: string) {
  return requestJson<VendorBusinessUnitDocument[]>(`/api/vendor-business-units/${id}/documents`);
}

export async function uploadVendorBusinessUnitDocument(
  id: string,
  payload: {
    documentTitle: string;
    documentType: string;
    expiryDate?: string;
    file: File;
  }
) {
  const formData = new FormData();
  formData.set("documentTitle", payload.documentTitle);
  formData.set("documentType", payload.documentType);
  if (payload.expiryDate) {
    formData.set("expiryDate", payload.expiryDate);
  }
  formData.set("file", payload.file);
  return requestMultipart<VendorBusinessUnitDocument>(`/api/vendor-business-units/${id}/documents`, formData);
}

export async function deleteVendorBusinessUnitDocument(id: string, documentId: string) {
  return requestVoid(`/api/vendor-business-units/${id}/documents/${documentId}`, {
    method: "DELETE"
  });
}

export async function fetchVendorBusinessUnitDocumentFile(id: string, documentId: string) {
  return requestBlob(`/api/vendor-business-units/${id}/documents/${documentId}/file`);
}

export async function fetchVendorBusinessUnitAudits(id: string) {
  return requestJson<VendorBusinessUnitAudit[]>(`/api/vendor-business-units/${id}/audits`);
}

export async function createVendorBusinessUnitAudit(
  id: string,
  payload: CreateVendorBusinessUnitAuditRequest
) {
  return requestMutation<VendorBusinessUnitAudit>(`/api/vendor-business-units/${id}/audits`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateVendorBusinessUnitAudit(
  id: string,
  auditId: string,
  payload: CreateVendorBusinessUnitAuditRequest
) {
  return requestMutation<VendorBusinessUnitAudit>(`/api/vendor-business-units/${id}/audits/${auditId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function fetchVendorMaterialApprovals(filters?: {
  vendorId?: string;
  vendorBusinessUnitId?: string;
  supplierId?: string;
  materialId?: string;
  status?: VendorMaterialApprovalStatus;
}) {
  const params = new URLSearchParams();
  if (filters?.vendorId) params.set("vendorId", filters.vendorId);
  if (filters?.vendorBusinessUnitId) params.set("vendorBusinessUnitId", filters.vendorBusinessUnitId);
  if (filters?.supplierId) params.set("supplierId", filters.supplierId);
  if (filters?.materialId) params.set("materialId", filters.materialId);
  if (filters?.status) params.set("status", filters.status);
  const query = params.toString();
  return requestJson<VendorMaterialApproval[]>(`/api/vendor-material-approvals${query ? `?${query}` : ""}`);
}

export async function createVendorMaterialApproval(payload: CreateVendorMaterialApprovalRequest) {
  return requestMutation<VendorMaterialApproval>("/api/vendor-material-approvals", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateVendorMaterialApproval(id: string, payload: CreateVendorMaterialApprovalRequest) {
  return requestMutation<VendorMaterialApproval>(`/api/vendor-material-approvals/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteVendorMaterialApproval(id: string) {
  return requestVoid(`/api/vendor-material-approvals/${id}`, {
    method: "DELETE"
  });
}

export async function fetchMaterials(page = 0, size = 20) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<Material>>(`/api/materials?${params.toString()}`);
}

export async function createMaterial(payload: CreateMaterialRequest) {
  return requestMutation<Material>("/api/materials", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateMaterial(id: string, payload: CreateMaterialRequest) {
  return requestMutation<Material>(`/api/materials/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteMaterial(id: string) {
  return requestVoid(`/api/materials/${id}`, {
    method: "DELETE"
  });
}

export async function linkMaterialSpec(id: string, payload: LinkMaterialSpecRequest) {
  return requestMutation<MaterialSpecLink>(`/api/materials/${id}/spec`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function delinkMaterialSpec(id: string, payload?: DelinkMaterialSpecRequest) {
  return requestVoid(`/api/materials/${id}/spec`, {
    method: "DELETE",
    body: JSON.stringify(payload ?? {})
  });
}

export async function fetchMaterialSpecHistory(id: string) {
  return requestJson<MaterialSpecLink[]>(`/api/materials/${id}/spec/history`);
}

export async function fetchSpecs() {
  return requestJson<Spec[]>("/api/specs");
}

export async function createSpec(payload: CreateSpecRequest) {
  return requestMutation<Spec>("/api/specs", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateSpec(id: string, payload: CreateSpecRequest) {
  return requestMutation<Spec>(`/api/specs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteSpec(id: string) {
  return requestVoid(`/api/specs/${id}`, {
    method: "DELETE"
  });
}

export async function submitSpec(id: string, payload?: ReviewSubmissionRequest) {
  return requestMutation<Spec>(`/api/specs/${id}/submit`, {
    method: "POST",
    body: JSON.stringify(payload ?? {})
  });
}

export async function approveSpec(id: string) {
  return requestMutation<Spec>(`/api/specs/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function rejectSpec(id: string, payload: RejectRequest) {
  return requestMutation<Spec>(`/api/specs/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function reviseSpec(id: string) {
  return requestMutation<Spec>(`/api/specs/${id}/revise`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function obsoleteSpec(id: string) {
  return requestMutation<Spec>(`/api/specs/${id}/obsolete`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function fetchSpecReviewQueue() {
  return requestJson<Spec[]>("/api/specs/review-queue");
}

export async function fetchSpecParameters(id: string) {
  return requestJson<SpecParameter[]>(`/api/specs/${id}/parameters`);
}

export async function fetchSpecMaterialLinks(id: string) {
  return requestJson<MaterialSpecLink[]>(`/api/specs/${id}/material-links`);
}

export async function createSpecParameter(id: string, payload: SpecParameterRequest) {
  return requestMutation<SpecParameter>(`/api/specs/${id}/parameters`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateSpecParameter(specId: string, parameterId: string, payload: SpecParameterRequest) {
  return requestMutation<SpecParameter>(`/api/specs/${specId}/parameters/${parameterId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteSpecParameter(specId: string, parameterId: string) {
  return requestVoid(`/api/specs/${specId}/parameters/${parameterId}`, {
    method: "DELETE"
  });
}

export async function fetchMoas() {
  return requestJson<Moa[]>("/api/moas");
}

export async function createMoa(payload: CreateMoaRequest) {
  return requestMutation<Moa>("/api/moas", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateMoa(id: string, payload: CreateMoaRequest) {
  return requestMutation<Moa>(`/api/moas/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteMoa(id: string) {
  return requestVoid(`/api/moas/${id}`, {
    method: "DELETE"
  });
}

export async function submitMoa(id: string, payload?: ReviewSubmissionRequest) {
  return requestMutation<Moa>(`/api/moas/${id}/submit`, {
    method: "POST",
    body: JSON.stringify(payload ?? {})
  });
}

export async function approveMoa(id: string) {
  return requestMutation<Moa>(`/api/moas/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function rejectMoa(id: string, payload: RejectRequest) {
  return requestMutation<Moa>(`/api/moas/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function obsoleteMoa(id: string) {
  return requestMutation<Moa>(`/api/moas/${id}/obsolete`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function fetchMoaReviewQueue() {
  return requestJson<Moa[]>("/api/moas/review-queue");
}

export async function fetchSamplingTools() {
  return requestJson<SamplingTool[]>("/api/sampling-tools");
}

export async function createSamplingTool(payload: CreateSamplingToolRequest) {
  return requestMutation<SamplingTool>("/api/sampling-tools", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateSamplingTool(id: string, payload: CreateSamplingToolRequest) {
  return requestMutation<SamplingTool>(`/api/sampling-tools/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteSamplingTool(id: string) {
  return requestVoid(`/api/sampling-tools/${id}`, {
    method: "DELETE"
  });
}

export async function fetchWarehouses(page = 0, size = 50) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<Warehouse>>(`/api/warehouses?${params.toString()}`);
}

export async function fetchWarehouseTree() {
  return requestJson<WarehouseTreeNode[]>("/api/warehouses/tree");
}

export async function createWarehouse(payload: CreateWarehouseRequest) {
  return requestMutation<Warehouse>("/api/warehouses", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchBusinessUnits(page = 0, size = 50) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<BusinessUnit>>(`/api/business-units?${params.toString()}`);
}

export async function createBusinessUnit(payload: CreateBusinessUnitRequest) {
  return requestMutation<BusinessUnit>("/api/business-units", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateWarehouse(id: string, payload: CreateWarehouseRequest) {
  return requestMutation<Warehouse>(`/api/warehouses/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      warehouseCode: payload.warehouseCode,
      warehouseName: payload.warehouseName,
      businessUnitId: payload.businessUnitId,
      description: payload.description,
      updatedBy: payload.createdBy
    })
  });
}

export async function deleteWarehouse(id: string) {
  return requestVoid(`/api/warehouses/${id}`, {
    method: "DELETE"
  });
}

export async function fetchRooms(page = 0, size = 50, warehouseId?: string) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  if (warehouseId) {
    params.set("warehouseId", warehouseId);
  }
  return requestJson<PageResponse<Room>>(`/api/rooms?${params.toString()}`);
}

export async function createRoom(warehouseId: string, payload: CreateRoomRequest) {
  return requestMutation<Room>(`/api/warehouses/${warehouseId}/rooms`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateRoom(warehouseId: string, id: string, payload: CreateRoomRequest) {
  return requestMutation<Room>(`/api/warehouses/${warehouseId}/rooms/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      roomCode: payload.roomCode,
      roomName: payload.roomName,
      storageCondition: payload.storageCondition,
      description: payload.description,
      maxCapacity: payload.maxCapacity,
      capacityUom: payload.capacityUom,
      temperatureRange: payload.temperatureRange,
      humidityRange: payload.humidityRange,
      updatedBy: payload.createdBy
    })
  });
}

export async function deleteRoom(id: string) {
  return requestVoid(`/api/rooms/${id}`, {
    method: "DELETE"
  });
}

export async function fetchRacks(page = 0, size = 50, roomId?: string) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  if (roomId) {
    params.set("roomId", roomId);
  }
  return requestJson<PageResponse<Rack>>(`/api/racks?${params.toString()}`);
}

export async function createRack(roomId: string, payload: CreateRackRequest) {
  return requestMutation<Rack>(`/api/rooms/${roomId}/racks`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateRack(roomId: string, id: string, payload: CreateRackRequest) {
  return requestMutation<Rack>(`/api/rooms/${roomId}/racks/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      rackCode: payload.rackCode,
      rackName: payload.rackName,
      description: payload.description,
      updatedBy: payload.createdBy
    })
  });
}

export async function deleteRack(id: string) {
  return requestVoid(`/api/racks/${id}`, {
    method: "DELETE"
  });
}

export async function fetchShelves(page = 0, size = 50, rackId?: string) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  if (rackId) {
    params.set("rackId", rackId);
  }
  return requestJson<PageResponse<Shelf>>(`/api/shelves?${params.toString()}`);
}

export async function createShelf(rackId: string, payload: CreateShelfRequest) {
  return requestMutation<Shelf>(`/api/racks/${rackId}/shelves`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateShelf(rackId: string, id: string, payload: CreateShelfRequest) {
  return requestMutation<Shelf>(`/api/racks/${rackId}/shelves/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      shelfCode: payload.shelfCode,
      shelfName: payload.shelfName,
      description: payload.description,
      updatedBy: payload.createdBy
    })
  });
}

export async function deleteShelf(id: string) {
  return requestVoid(`/api/shelves/${id}`, {
    method: "DELETE"
  });
}

export async function fetchPallets(page = 0, size = 50, shelfId?: string) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  if (shelfId) {
    params.set("shelfId", shelfId);
  }
  return requestJson<PageResponse<Pallet>>(`/api/pallets?${params.toString()}`);
}

export async function fetchAvailablePallets(storageCondition?: string) {
  const params = new URLSearchParams();
  if (storageCondition) {
    params.set("storageCondition", storageCondition);
  }
  const query = params.toString();
  return requestJson<AvailablePallet[]>(query ? `/api/pallets/available?${query}` : "/api/pallets/available");
}

export async function createPallet(shelfId: string, payload: CreatePalletRequest) {
  return requestMutation<Pallet>(`/api/shelves/${shelfId}/pallets`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updatePallet(shelfId: string, id: string, payload: CreatePalletRequest) {
  return requestMutation<Pallet>(`/api/shelves/${shelfId}/pallets/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      palletCode: payload.palletCode,
      palletName: payload.palletName,
      description: payload.description,
      updatedBy: payload.createdBy
    })
  });
}

export async function deletePallet(id: string) {
  return requestVoid(`/api/pallets/${id}`, {
    method: "DELETE"
  });
}

export async function fetchWmsSummary() {
  return requestJson<WmsSummary>("/api/wms/summary");
}

export async function fetchWarehouseZoneRules(roomId?: string) {
  const params = new URLSearchParams();
  if (roomId) {
    params.set("roomId", roomId);
  }
  return requestJson<WarehouseZoneRule[]>(
    `/api/wms/zone-rules${params.size > 0 ? `?${params.toString()}` : ""}`
  );
}

export async function createWarehouseZoneRule(payload: CreateWarehouseZoneRuleRequest) {
  return requestMutation<WarehouseZoneRule>("/api/wms/zone-rules", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateWarehouseZoneRule(id: string, payload: CreateWarehouseZoneRuleRequest) {
  return requestMutation<WarehouseZoneRule>(`/api/wms/zone-rules/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteWarehouseZoneRule(id: string) {
  return requestVoid(`/api/wms/zone-rules/${id}`, {
    method: "DELETE"
  });
}

export async function fetchMaterialLocationRules(materialId?: string) {
  const params = new URLSearchParams();
  if (materialId) {
    params.set("materialId", materialId);
  }
  return requestJson<MaterialLocationRule[]>(
    `/api/wms/material-location-rules${params.size > 0 ? `?${params.toString()}` : ""}`
  );
}

export async function createMaterialLocationRule(payload: CreateMaterialLocationRuleRequest) {
  return requestMutation<MaterialLocationRule>("/api/wms/material-location-rules", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateMaterialLocationRule(id: string, payload: CreateMaterialLocationRuleRequest) {
  return requestMutation<MaterialLocationRule>(`/api/wms/material-location-rules/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteMaterialLocationRule(id: string) {
  return requestVoid(`/api/wms/material-location-rules/${id}`, {
    method: "DELETE"
  });
}

export async function fetchBatches(page = 0, size = 20) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<Batch>>(`/api/batches?${params.toString()}`);
}

export async function fetchInventory(page = 0, size = 20) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<InventoryRecord>>(`/api/inventory?${params.toString()}`);
}

export async function fetchInventoryTransactions(page = 0, size = 20) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<InventoryTransaction>>(
    `/api/inventory/transactions?${params.toString()}`
  );
}

export async function updateInventoryStatus(id: string, status: InventoryRecord["status"], remarks?: string) {
  return requestMutation<InventoryRecord>(`/api/inventory/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({
      status,
      remarks
    })
  });
}

export async function adjustInventory(id: string, quantityDelta: number, reason: string) {
  return requestMutation<InventoryRecord>(`/api/inventory/${id}/adjust`, {
    method: "POST",
    body: JSON.stringify({
      quantityDelta,
      reason
    })
  });
}

export async function issueInventory(
  id: string,
  quantity: number,
  referenceType: "PRODUCTION" | "DISPENSING" | "SAMPLING_REQUEST" | "OTHER",
  referenceNumber: string,
  reason: string,
  remarks?: string
) {
  return requestMutation<InventoryRecord>(`/api/inventory/${id}/issue`, {
    method: "POST",
    body: JSON.stringify({
      quantity,
      referenceType,
      referenceNumber,
      reason,
      remarks
    })
  });
}

export async function transferInventory(id: string, destinationPalletId: string, quantity: number, remarks?: string) {
  return requestMutation<InventoryRecord>(`/api/inventory/${id}/transfer`, {
    method: "POST",
    body: JSON.stringify({
      destinationPalletId,
      quantity,
      remarks
    })
  });
}

export async function fetchInventorySummary() {
  return requestJson<InventorySummary>("/api/inventory/summary");
}

export async function fetchSamplingRequests(page = 0, size = 20) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<SamplingRequest>>(
    `/api/sampling-requests?${params.toString()}`
  );
}

export async function fetchSamplingSummary() {
  return requestJson<SamplingSummary>("/api/sampling-requests/summary");
}

export async function createSamplingPlan(
  samplingRequestId: string,
  payload: SamplingPlanRequest
) {
  return requestMutation<SamplingRequest>(`/api/sampling-requests/${samplingRequestId}/plans`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateSamplingPlan(
  samplingRequestId: string,
  planId: string,
  payload: SamplingPlanRequest
) {
  return requestMutation<SamplingRequest>(
    `/api/sampling-requests/${samplingRequestId}/plans/${planId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload)
    }
  );
}

export async function startSampling(samplingRequestId: string, updatedBy: string) {
  return requestMutation<SamplingRequest>(`/api/sampling-requests/${samplingRequestId}/start`, {
    method: "POST",
    body: JSON.stringify({ updatedBy })
  });
}

export async function completeSampling(samplingRequestId: string, updatedBy: string) {
  return requestMutation<SamplingRequest>(`/api/sampling-requests/${samplingRequestId}/complete`, {
    method: "POST",
    body: JSON.stringify({ updatedBy })
  });
}

export async function handoffSamplingToQc(samplingRequestId: string, updatedBy: string) {
  return requestMutation<SamplingRequest>(`/api/sampling-requests/${samplingRequestId}/handoff-to-qc`, {
    method: "POST",
    body: JSON.stringify({ updatedBy })
  });
}

export async function receiveSamplingInQc(samplingRequestId: string, payload: QcReceiptRequest) {
  return requestMutation<SamplingRequest>(`/api/sampling-requests/${samplingRequestId}/qc-receipt`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function startSamplingQcReview(samplingRequestId: string, payload: StartQcReviewRequest) {
  return requestMutation<SamplingRequest>(`/api/sampling-requests/${samplingRequestId}/start-review`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchSamplingWorksheet(samplingRequestId: string) {
  return requestJson<QcWorksheetRow[]>(`/api/sampling-requests/${samplingRequestId}/worksheet`);
}

export async function fetchAuditEvents(entityType: string, entityId: string) {
  const params = new URLSearchParams({ entityType, entityId });
  return requestJson<AuditEvent[]>(`/api/audit-events?${params.toString()}`);
}

export async function fetchESignatures(entityType: string, entityId: string) {
  const params = new URLSearchParams({ entityType, entityId });
  return requestJson<ESignatureRecord[]>(`/api/e-signatures?${params.toString()}`);
}

export async function createESignature(payload: CreateESignatureRequest) {
  return requestMutation<ESignatureRecord>("/api/e-signatures", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchSamplingCycles(samplingRequestId: string) {
  return requestJson<SamplingRequest[]>(`/api/sampling-requests/${samplingRequestId}/cycles`);
}

export async function fetchSamplingInvestigations(samplingRequestId: string) {
  return requestJson<QcInvestigation[]>(`/api/sampling-requests/${samplingRequestId}/investigations`);
}

export async function recordSamplingWorksheetResult(
  samplingRequestId: string,
  testResultId: string,
  payload: RecordQcWorksheetResultRequest
) {
  return requestMutation<QcWorksheetRow>(`/api/sampling-requests/${samplingRequestId}/worksheet/${testResultId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function amendSamplingWorksheetResult(
  samplingRequestId: string,
  testResultId: string,
  payload: AmendQcWorksheetResultRequest
) {
  return requestMutation<QcWorksheetRow>(`/api/sampling-requests/${samplingRequestId}/worksheet/${testResultId}/amend`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function openSamplingInvestigation(
  samplingRequestId: string,
  payload: OpenQcInvestigationRequest
) {
  return requestMutation<QcInvestigation>(`/api/sampling-requests/${samplingRequestId}/investigations`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function resolveSamplingInvestigation(
  samplingRequestId: string,
  investigationId: string,
  payload: ResolveQcInvestigationRequest
) {
  return requestMutation<QcInvestigation>(`/api/sampling-requests/${samplingRequestId}/investigations/${investigationId}/resolve`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function completeSamplingInvestigationQaReview(
  samplingRequestId: string,
  investigationId: string,
  payload: CompleteQaInvestigationReviewRequest
) {
  return requestMutation<QcInvestigation>(`/api/sampling-requests/${samplingRequestId}/investigations/${investigationId}/qa-review`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function escalateSamplingInvestigationToPhaseTwo(
  samplingRequestId: string,
  investigationId: string,
  payload: EscalateQcInvestigationRequest
) {
  return requestMutation<QcInvestigation>(`/api/sampling-requests/${samplingRequestId}/investigations/${investigationId}/phase-ii`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function completeInvestigationPhase1(
  samplingRequestId: string,
  investigationId: string,
  payload: CompletePhase1Request
) {
  return requestMutation<QcInvestigation>(`/api/sampling-requests/${samplingRequestId}/investigations/${investigationId}/complete-phase-1`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function completeInvestigationPhase2(
  samplingRequestId: string,
  investigationId: string,
  payload: CompletePhase2Request
) {
  return requestMutation<QcInvestigation>(`/api/sampling-requests/${samplingRequestId}/investigations/${investigationId}/complete-phase-2`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function executeSamplingRetest(
  samplingRequestId: string,
  payload: ExecuteRetestRequest
) {
  return requestMutation<SamplingRequest>(`/api/sampling-requests/${samplingRequestId}/retest`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function destroySamplingRetainedSample(
  samplingRequestId: string,
  payload: DestroyRetainedSampleRequest
) {
  return requestMutation<SamplingRequest>(`/api/sampling-requests/${samplingRequestId}/retained-sample/destroy`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function executeSamplingResample(
  samplingRequestId: string,
  payload: ExecuteResampleRequest
) {
  return requestMutation<SamplingRequest>(`/api/sampling-requests/${samplingRequestId}/resample`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function recordQcDecision(
  samplingRequestId: string,
  payload: QcDecisionRequest
) {
  return requestMutation<SamplingRequest>(
    `/api/sampling-requests/${samplingRequestId}/qc-decision`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export type SecurityAuditEvent = {
  id: string;
  eventType: string;
  username: string | null;
  ipAddress: string | null;
  details: string | null;
  occurredAt: string;
};

export async function fetchSecurityAuditEvents(params?: {
  username?: string;
  from?: string;
  to?: string;
}): Promise<SecurityAuditEvent[]> {
  const query = new URLSearchParams();
  if (params?.username) query.set("username", params.username);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  const qs = query.toString();
  return requestJson<SecurityAuditEvent[]>(`/api/audit/security-events${qs ? `?${qs}` : ""}`);
}

export async function fetchComplaints(page = 0, size = 100) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return requestJson<PageResponse<Complaint>>(`/api/complaints?${params.toString()}`);
}

export async function fetchComplaint(id: string) {
  return requestJson<Complaint>(`/api/complaints/${id}`);
}

export async function fetchComplaintSummary() {
  return requestJson<ComplaintSummary>("/api/complaints/summary");
}

export async function createComplaint(payload: CreateComplaintRequest) {
  return requestMutation<Complaint>("/api/complaints", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateComplaint(id: string, payload: UpdateComplaintRequest) {
  return requestMutation<Complaint>(`/api/complaints/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function updateComplaintStatus(id: string, payload: ComplaintStatusUpdateRequest) {
  return requestMutation<Complaint>(`/api/complaints/${id}/status`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function linkComplaintDeviation(id: string, deviationId: string) {
  return requestMutation<Complaint>(`/api/complaints/${id}/link-deviation`, { method: "POST", body: JSON.stringify({ deviationId }) });
}

export async function linkComplaintCapa(id: string, capaId: string) {
  return requestMutation<Complaint>(`/api/complaints/${id}/link-capa`, { method: "POST", body: JSON.stringify({ capaId }) });
}

export async function fetchEquipmentList(page = 0, size = 100) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return requestJson<PageResponse<Equipment>>(`/api/equipment?${params.toString()}`);
}

export async function fetchActiveInstruments() {
  return requestJson<Equipment[]>("/api/equipment/active");
}

export async function fetchEquipment(id: string) {
  return requestJson<Equipment>(`/api/equipment/${id}`);
}

export async function fetchEquipmentSummary() {
  return requestJson<EquipmentSummary>("/api/equipment/summary");
}

export async function createEquipment(payload: CreateEquipmentRequest) {
  return requestMutation<Equipment>("/api/equipment", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateEquipment(id: string, payload: UpdateEquipmentRequest) {
  return requestMutation<Equipment>(`/api/equipment/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function fetchQualificationRecords(equipmentId: string) {
  return requestJson<QualificationRecord[]>(`/api/equipment/${equipmentId}/qualifications`);
}

export async function addQualificationRecord(equipmentId: string, payload: CreateQualificationRecordRequest) {
  return requestMutation<QualificationRecord>(`/api/equipment/${equipmentId}/qualifications`, { method: "POST", body: JSON.stringify(payload) });
}

export async function fetchRiskAssessments(page = 0, size = 100) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return requestJson<PageResponse<RiskAssessment>>(`/api/risk-assessments?${params.toString()}`);
}

export async function fetchRiskAssessment(id: string) {
  return requestJson<RiskAssessment>(`/api/risk-assessments/${id}`);
}

export async function fetchRiskAssessmentSummary() {
  return requestJson<RiskAssessmentSummary>("/api/risk-assessments/summary");
}

export async function createRiskAssessment(payload: CreateRiskAssessmentRequest) {
  return requestMutation<RiskAssessment>("/api/risk-assessments", { method: "POST", body: JSON.stringify(payload) });
}

export async function addRiskItem(assessmentId: string, payload: CreateRiskItemRequest) {
  return requestMutation<RiskItem>(`/api/risk-assessments/${assessmentId}/items`, { method: "POST", body: JSON.stringify(payload) });
}

export async function updateRiskItem(assessmentId: string, itemId: string, payload: CreateRiskItemRequest) {
  return requestMutation<RiskItem>(`/api/risk-assessments/${assessmentId}/items/${itemId}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteRiskItem(assessmentId: string, itemId: string) {
  return requestVoid(`/api/risk-assessments/${assessmentId}/items/${itemId}`, { method: "DELETE" });
}

export async function acceptRiskAssessment(id: string, payload: AcceptRiskAssessmentRequest) {
  return requestMutation<RiskAssessment>(`/api/risk-assessments/${id}/accept`, { method: "POST", body: JSON.stringify(payload) });
}

export async function fetchApqrs(filters: { year?: number; materialId?: string; status?: ApqrStatus } = {}, page = 0, size = 100) {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort: "reviewYear,desc" });
  if (filters.year) params.set("year", String(filters.year));
  if (filters.materialId) params.set("materialId", filters.materialId);
  if (filters.status) params.set("status", filters.status);
  return requestJson<ApqrPage>(`/api/apqr?${params.toString()}`);
}

export async function fetchApqr(id: string) {
  return requestJson<Apqr>(`/api/apqr/${id}`);
}

export async function fetchApqrSummary() {
  return requestJson<ApqrSummaryItem[]>("/api/apqr/summary");
}

export async function createApqr(payload: CreateApqrRequest) {
  return requestMutation<Apqr>("/api/apqr", { method: "POST", body: JSON.stringify(payload) });
}

export async function compileApqr(id: string) {
  return requestMutation<Apqr>(`/api/apqr/${id}/compile`, { method: "POST" });
}

export async function updateApqrConclusions(id: string, payload: ApqrConclusionRequest) {
  return requestMutation<Apqr>(`/api/apqr/${id}/conclusions`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function approveApqr(id: string, payload: ApproveApqrRequest) {
  return requestMutation<Apqr>(`/api/apqr/${id}/approve`, { method: "POST", body: JSON.stringify(payload) });
}

export async function closeApqr(id: string) {
  return requestMutation<Apqr>(`/api/apqr/${id}/close`, { method: "POST" });
}

export async function fetchQpBatchReleases(
  filters: { status?: BatchReleaseStatus; materialId?: string } = {},
  page = 0,
  size = 100
) {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort: "createdAt,desc" });
  if (filters.status) params.set("status", filters.status);
  if (filters.materialId) params.set("materialId", filters.materialId);
  return requestJson<QpBatchReleasePage>(`/api/qp-batch-releases?${params.toString()}`);
}

export async function fetchQpBatchRelease(id: string) {
  return requestJson<QpBatchRelease>(`/api/qp-batch-releases/${id}`);
}

export async function createQpBatchRelease(payload: CreateQpBatchReleaseRequest) {
  return requestMutation<QpBatchRelease>("/api/qp-batch-releases", { method: "POST", body: JSON.stringify(payload) });
}

export async function certifyQpBatchRelease(id: string, payload: CertifyBatchRequest) {
  return requestMutation<QpBatchRelease>(`/api/qp-batch-releases/${id}/certify`, { method: "POST", body: JSON.stringify(payload) });
}

export async function rejectQpBatchRelease(id: string, payload: RejectBatchRequest) {
  return requestMutation<QpBatchRelease>(`/api/qp-batch-releases/${id}/reject`, { method: "POST", body: JSON.stringify(payload) });
}

export async function fetchQpBatchCertificate(id: string) {
  return requestJson<BatchCertificate>(`/api/qp-batch-releases/${id}/certificate`);
}

export async function fetchCoaDetails(id: string) {
  return requestJson<CoaResponse>(`/api/qp-batch-releases/${id}/coa`);
}

export async function analystSignCoa(id: string, payload: AnalystSignCoaRequest) {
  return requestMutation<CoaResponse>(`/api/qp-batch-releases/${id}/coa/analyst-sign`, { method: "POST", body: JSON.stringify(payload) });
}

export async function issueCoa(id: string, payload: IssueCoaRequest) {
  return requestMutation<CoaResponse>(`/api/qp-batch-releases/${id}/coa/issue`, { method: "POST", body: JSON.stringify(payload) });
}

export async function fetchSupplierQualityAgreements(
  filters: { supplierId?: string; status?: SupplierQualityAgreementStatus } = {},
  page = 0,
  size = 100
) {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort: "createdAt,desc" });
  if (filters.supplierId) params.set("supplierId", filters.supplierId);
  if (filters.status) params.set("status", filters.status);
  return requestJson<SupplierQualityAgreementPage>(`/api/supplier-quality-agreements?${params.toString()}`);
}

export async function fetchSupplierQualityAgreement(id: string) {
  return requestJson<SupplierQualityAgreement>(`/api/supplier-quality-agreements/${id}`);
}

export async function createSupplierQualityAgreement(payload: CreateSupplierQualityAgreementRequest) {
  return requestMutation<SupplierQualityAgreement>("/api/supplier-quality-agreements", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateSupplierQualityAgreement(id: string, payload: CreateSupplierQualityAgreementRequest) {
  return requestMutation<SupplierQualityAgreement>(`/api/supplier-quality-agreements/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function updateSupplierQualityAgreementStatus(id: string, payload: SupplierQualityAgreementStatusRequest) {
  return requestMutation<SupplierQualityAgreement>(`/api/supplier-quality-agreements/${id}/status`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function fetchExpiringSupplierQualityAgreements(days = 60) {
  return requestJson<SupplierQualityAgreement[]>(`/api/supplier-quality-agreements/expiring-soon?days=${days}`);
}

export async function fetchSuppliersWithoutSqa() {
  return requestJson<Supplier[]>("/api/supplier-quality-agreements/suppliers-without-sqa");
}

export async function fetchSupplierQualityAgreementsBySupplier(supplierId: string) {
  return requestJson<SupplierQualityAgreement[]>(`/api/suppliers/${supplierId}/quality-agreements`);
}

export async function fetchLotTraceability(searchKey: string) {
  return requestJson<LotTraceabilityResponse>(`/api/lots/${encodeURIComponent(searchKey)}/traceability`);
}

// Retention Samples
export async function fetchRetentionSamples(params: { status?: string; materialId?: string; lotNumber?: string; page?: number; size?: number } = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.materialId) q.set("materialId", params.materialId);
  if (params.lotNumber) q.set("lotNumber", params.lotNumber);
  q.set("page", String(params.page ?? 0));
  q.set("size", String(params.size ?? 20));
  return requestJson<PageResponse<RetentionSample>>(`/api/retention-samples?${q.toString()}`);
}

export async function fetchRetentionSampleById(id: string) {
  return requestJson<RetentionSample>(`/api/retention-samples/${id}`);
}

export async function fetchRetentionSampleSummary() {
  return requestJson<RetentionSampleSummary>("/api/retention-samples/summary");
}

export async function fetchExpiringSoonRetentionSamples(days = 30) {
  return requestJson<RetentionSample[]>(`/api/retention-samples/expiring-soon?days=${days}`);
}

export async function fetchDueForDisposalRetentionSamples() {
  return requestJson<RetentionSample[]>("/api/retention-samples/due-for-disposal");
}

export async function createRetentionSample(payload: CreateRetentionSampleRequest) {
  return requestMutation<RetentionSample>("/api/retention-samples", { method: "POST", body: JSON.stringify(payload) });
}

export async function retrieveRetentionSample(id: string, payload: RetrieveRetentionSampleRequest) {
  return requestMutation<RetentionSample>(`/api/retention-samples/${id}/retrieve`, { method: "POST", body: JSON.stringify(payload) });
}

export async function disposeRetentionSample(id: string, payload: DisposeRetentionSampleRequest) {
  return requestMutation<RetentionSample>(`/api/retention-samples/${id}/dispose`, { method: "POST", body: JSON.stringify(payload) });
}
