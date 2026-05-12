import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createEmployee, deactivateEmployee, fetchEmployees, updateEmployee } from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import type { Employee, EmployeeQualificationStatus, EmployeeRequest, EmployeeStatus } from "../../types/employee";

const EMPLOYMENT_STATUSES: EmployeeStatus[] = ["ACTIVE", "ON_LEAVE", "INACTIVE", "TERMINATED"];
const QUALIFICATION_STATUSES: EmployeeQualificationStatus[] = ["PENDING", "QUALIFIED", "TRAINING_DUE", "SUSPENDED"];

type FormState = {
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  site: string;
  jobTitle: string;
  managerEmployeeId: string;
  employmentStatus: EmployeeStatus;
  qualificationStatus: EmployeeQualificationStatus;
  joinedOn: string;
  lastTrainingDate: string;
  nextTrainingDue: string;
  remarks: string;
};

const EMPTY_FORM: FormState = {
  employeeCode: "",
  fullName: "",
  email: "",
  phone: "",
  department: "",
  site: "",
  jobTitle: "",
  managerEmployeeId: "",
  employmentStatus: "ACTIVE",
  qualificationStatus: "PENDING",
  joinedOn: "",
  lastTrainingDate: "",
  nextTrainingDue: "",
  remarks: ""
};

function label(value: string) {
  return value.replace(/_/g, " ");
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function toForm(employee: Employee): FormState {
  return {
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    department: employee.department,
    site: employee.site ?? "",
    jobTitle: employee.jobTitle,
    managerEmployeeId: employee.managerEmployeeId ?? "",
    employmentStatus: employee.employmentStatus,
    qualificationStatus: employee.qualificationStatus,
    joinedOn: employee.joinedOn ?? "",
    lastTrainingDate: employee.lastTrainingDate ?? "",
    nextTrainingDue: employee.nextTrainingDue ?? "",
    remarks: employee.remarks ?? ""
  };
}

function toPayload(form: FormState, actor: string, mode: "create" | "edit"): EmployeeRequest {
  return {
    employeeCode: form.employeeCode.trim(),
    fullName: form.fullName.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    department: form.department.trim(),
    site: form.site.trim() || null,
    jobTitle: form.jobTitle.trim(),
    managerEmployeeId: form.managerEmployeeId || null,
    employmentStatus: form.employmentStatus,
    qualificationStatus: form.qualificationStatus,
    joinedOn: form.joinedOn || null,
    lastTrainingDate: form.lastTrainingDate || null,
    nextTrainingDue: form.nextTrainingDue || null,
    remarks: form.remarks.trim() || null,
    ...(mode === "create" ? { createdBy: actor } : { updatedBy: actor })
  };
}

function validate(form: FormState) {
  if (!form.employeeCode.trim()) return "Employee code is required.";
  if (!form.fullName.trim()) return "Full name is required.";
  if (!form.department.trim()) return "Department is required.";
  if (!form.jobTitle.trim()) return "Job title is required.";
  return null;
}

function statusClass(status: EmployeeStatus) {
  if (status === "ACTIVE") return "bg-green-100 text-green-700";
  if (status === "ON_LEAVE") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function qualificationClass(status: EmployeeQualificationStatus) {
  if (status === "QUALIFIED") return "bg-blue-100 text-blue-700";
  if (status === "TRAINING_DUE") return "bg-amber-100 text-amber-700";
  if (status === "SUSPENDED") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
}

function EmployeeForm({
  title,
  form,
  setForm,
  employees,
  editingId,
  error,
  isSaving,
  onSubmit,
  onClose
}: {
  title: string;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  employees: Employee[];
  editingId?: string;
  error: string | null;
  isSaving: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const managers = employees.filter((employee) => employee.id !== editingId && employee.isActive);
  const inputClass = "w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-rose-300";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 px-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-rose-100 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-rose-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">Maintain employee identity, department, manager, and training readiness.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Close</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Employee Code</span>
              <input value={form.employeeCode} onChange={(event) => setForm((current) => ({ ...current, employeeCode: event.target.value }))} className={inputClass} placeholder="EMP-QC-0001" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Full Name</span>
              <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} className={inputClass} placeholder="Dr. Priya Sharma" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Department</span>
              <input value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} className={inputClass} placeholder="Quality Control" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Job Title</span>
              <input value={form.jobTitle} onChange={(event) => setForm((current) => ({ ...current, jobTitle: event.target.value }))} className={inputClass} placeholder="QC Analyst" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Email</span>
              <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={inputClass} placeholder="priya.sharma@batchsphere.local" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Phone</span>
              <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={inputClass} placeholder="+91 98765 43210" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Site</span>
              <input value={form.site} onChange={(event) => setForm((current) => ({ ...current, site: event.target.value }))} className={inputClass} placeholder="Hyderabad Plant" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Manager</span>
              <select value={form.managerEmployeeId} onChange={(event) => setForm((current) => ({ ...current, managerEmployeeId: event.target.value }))} className={inputClass}>
                <option value="">No manager selected</option>
                {managers.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.employeeCode} - {employee.fullName}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Employment Status</span>
              <select value={form.employmentStatus} onChange={(event) => setForm((current) => ({ ...current, employmentStatus: event.target.value as EmployeeStatus }))} className={inputClass}>
                {EMPLOYMENT_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Qualification Status</span>
              <select value={form.qualificationStatus} onChange={(event) => setForm((current) => ({ ...current, qualificationStatus: event.target.value as EmployeeQualificationStatus }))} className={inputClass}>
                {QUALIFICATION_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Joined On</span>
              <input type="date" value={form.joinedOn} onChange={(event) => setForm((current) => ({ ...current, joinedOn: event.target.value }))} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Last Training</span>
              <input type="date" value={form.lastTrainingDate} onChange={(event) => setForm((current) => ({ ...current, lastTrainingDate: event.target.value }))} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Next Training Due</span>
              <input type="date" value={form.nextTrainingDue} onChange={(event) => setForm((current) => ({ ...current, nextTrainingDue: event.target.value }))} className={inputClass} />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Remarks</span>
              <textarea value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} className={`${inputClass} min-h-24`} placeholder="Qualification notes, training limitations, or site assignment context." />
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-rose-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
          <button type="button" disabled={isSaving} onClick={onSubmit} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
            {isSaving ? "Saving..." : "Save Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmployeeDirectoryPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user?.username ?? "admin");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "ALL">("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["employees", true],
    queryFn: () => fetchEmployees(true)
  });
  const employees = data ?? [];
  const selected = employees.find((employee) => employee.id === selectedId) ?? employees[0] ?? null;
  const departments = Array.from(new Set(employees.map((employee) => employee.department))).sort();
  const dueSoonCount = employees.filter((employee) => {
    if (!employee.nextTrainingDue || !employee.isActive) return false;
    const due = new Date(employee.nextTrainingDue).getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due - today.getTime() <= 1000 * 60 * 60 * 24 * 30;
  }).length;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return employees.filter((employee) => {
      if (statusFilter !== "ALL" && employee.employmentStatus !== statusFilter) return false;
      if (departmentFilter !== "ALL" && employee.department !== departmentFilter) return false;
      if (!term) return true;
      return [
        employee.employeeCode,
        employee.fullName,
        employee.email ?? "",
        employee.department,
        employee.jobTitle,
        employee.site ?? ""
      ].some((value) => value.toLowerCase().includes(term));
    });
  }, [departmentFilter, employees, search, statusFilter]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validationError = validate(form);
      if (validationError) throw new Error(validationError);
      return editing
        ? updateEmployee(editing.id, toPayload(form, currentUser, "edit"))
        : createEmployee(toPayload(form, currentUser, "create"));
    },
    onSuccess: async (saved) => {
      toast.success(editing ? "Employee updated." : "Employee created.");
      setSelectedId(saved.id);
      setIsFormOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (mutationError) => {
      setFormError(mutationError instanceof Error ? mutationError.message : "Failed to save employee.");
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: (employee: Employee) => deactivateEmployee(employee.id, currentUser),
    onSuccess: async () => {
      toast.success("Employee deactivated.");
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (mutationError) => {
      toast.error(mutationError instanceof Error ? mutationError.message : "Failed to deactivate employee.");
    }
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEdit(employee: Employee) {
    setEditing(employee);
    setForm(toForm(employee));
    setFormError(null);
    setIsFormOpen(true);
  }

  const pageError = error instanceof Error ? error.message : error ? "Failed to load employees." : null;

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400">Enterprise / <span className="font-medium text-rose-700">HRMS</span></p>
          <h1 className="mt-1 text-xl font-bold text-slate-800">Employee Directory</h1>
          <p className="mt-0.5 text-sm text-slate-500">Employee, department, manager, and qualification foundation for training, CAPA ownership, and alerts.</p>
        </div>
        <button type="button" onClick={openCreate} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">Add Employee</button>
      </section>

      {pageError ? <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</section> : null}

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Employees", value: employees.length },
          { label: "Active", value: employees.filter((employee) => employee.employmentStatus === "ACTIVE").length },
          { label: "Qualified", value: employees.filter((employee) => employee.qualificationStatus === "QUALIFIED").length },
          { label: "Training Due", value: dueSoonCount }
        ].map((item) => (
          <article key={item.label} className="rounded-xl border border-rose-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">{isLoading ? "-" : item.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.8fr)]">
        <article className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 bg-rose-50/60 px-5 py-3">
            <div className="flex flex-wrap gap-2">
              {(["ALL", "ACTIVE", "ON_LEAVE", "INACTIVE"] as Array<EmployeeStatus | "ALL">).map((status) => (
                <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${statusFilter === status ? "bg-rose-600 text-white" : "text-slate-500 hover:bg-white"}`}>
                  {status === "ALL" ? "All" : label(status)}
                </button>
              ))}
              <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="rounded-lg border border-rose-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none">
                <option value="ALL">All departments</option>
                {departments.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
            </div>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee, code, department..." className="w-full max-w-xs rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-rose-300" />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-rose-50 bg-rose-50/40 text-left text-[11px] font-semibold uppercase text-slate-500">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Training</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-slate-500">Loading employees...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-slate-500">No employees match the current filters.</td></tr>
                ) : filtered.map((employee) => (
                  <tr key={employee.id} onClick={() => setSelectedId(employee.id)} className={`cursor-pointer border-b border-rose-50 hover:bg-rose-50/40 ${selected?.id === employee.id ? "bg-rose-50/60" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{employee.fullName}</div>
                      <div className="font-mono text-xs text-slate-500">{employee.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{employee.department}</div>
                      <div className="text-xs text-slate-400">{employee.jobTitle}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(employee.employmentStatus)}`}>{label(employee.employmentStatus)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${qualificationClass(employee.qualificationStatus)}`}>{label(employee.qualificationStatus)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={(event) => { event.stopPropagation(); openEdit(employee); }} className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700">Edit</button>
                        <button type="button" disabled={!employee.isActive || deactivateMutation.isPending} onClick={(event) => { event.stopPropagation(); void deactivateMutation.mutate(employee); }} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40">Deactivate</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
          {selected ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-rose-600">{selected.employeeCode}</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-800">{selected.fullName}</h2>
                  <p className="text-sm text-slate-500">{selected.jobTitle}</p>
                </div>
                <button type="button" onClick={() => openEdit(selected)} className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700">Edit</button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Department", selected.department],
                  ["Site", selected.site ?? "-"],
                  ["Manager", selected.managerName ?? "-"],
                  ["Joined", formatDate(selected.joinedOn)],
                  ["Last Training", formatDate(selected.lastTrainingDate)],
                  ["Next Training", formatDate(selected.nextTrainingDue)]
                ].map(([name, value]) => (
                  <div key={name} className="rounded-xl bg-rose-50/60 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase text-slate-400">{name}</div>
                    <div className="mt-1 font-medium text-slate-700">{value}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">Contact</div>
                <p className="mt-1 text-sm text-slate-700">{selected.email ?? "-"}</p>
                <p className="text-sm text-slate-500">{selected.phone ?? "-"}</p>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">Remarks</div>
                <p className="mt-1 text-sm text-slate-600">{selected.remarks ?? "No remarks recorded."}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select an employee to view details.</p>
          )}
        </aside>
      </section>

      {isFormOpen ? (
        <EmployeeForm
          title={editing ? "Update Employee" : "Add Employee"}
          form={form}
          setForm={setForm}
          employees={employees}
          editingId={editing?.id}
          error={formError}
          isSaving={saveMutation.isPending}
          onSubmit={() => void saveMutation.mutate()}
          onClose={() => setIsFormOpen(false)}
        />
      ) : null}
    </div>
  );
}
