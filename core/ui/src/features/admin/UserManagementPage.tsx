import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createManagedUser,
  deactivateManagedUser,
  fetchManagedUsers,
  updateManagedUser
} from "../../lib/api";
import type {
  CreateManagedUserRequest,
  ManagedUser,
  UpdateManagedUserRequest,
  UserRole
} from "../../types/user-management";

const USER_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "WAREHOUSE_OP",
  "QC_ANALYST",
  "QC_MANAGER",
  "PROCUREMENT",
  "VIEWER"
];

type UserFilter = "ALL" | "ACTIVE" | "INACTIVE";

type UserFormState = {
  username: string;
  email: string;
  role: UserRole;
  employeeId: string;
  password: string;
  isActive: boolean;
};

const CREATE_FORM_DEFAULTS: UserFormState = {
  username: "",
  email: "",
  role: "VIEWER",
  employeeId: "",
  password: "",
  isActive: true
};

function roleLabel(role: UserRole) {
  return role.replace(/_/g, " ");
}

function toLocalDate(value: string | null) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function toUserFormState(user: ManagedUser): UserFormState {
  return {
    username: user.username,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId ?? "",
    password: "",
    isActive: user.isActive
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function buildCreatePayload(form: UserFormState): CreateManagedUserRequest {
  return {
    username: form.username.trim(),
    email: form.email.trim(),
    password: form.password,
    role: form.role,
    employeeId: form.employeeId.trim() ? form.employeeId.trim() : null
  };
}

function buildUpdatePayload(form: UserFormState): UpdateManagedUserRequest {
  const payload: UpdateManagedUserRequest = {
    email: form.email.trim(),
    role: form.role,
    isActive: form.isActive,
    employeeId: form.employeeId.trim() ? form.employeeId.trim() : null
  };

  if (form.password.trim()) {
    payload.password = form.password;
  }

  return payload;
}

function validateForm(form: UserFormState, mode: "create" | "edit") {
  if (mode === "create" && !form.username.trim()) {
    return "Username is required.";
  }
  if (!form.email.trim()) {
    return "Email is required.";
  }
  if (mode === "create" && form.password.trim().length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (mode === "edit" && form.password.trim().length > 0 && form.password.trim().length < 8) {
    return "Updated password must be at least 8 characters.";
  }
  if (form.employeeId.trim() && !isUuid(form.employeeId.trim())) {
    return "Employee ID must be a valid UUID or left blank.";
  }
  return null;
}

function UserForm({
  mode,
  form,
  setForm,
  onSubmit,
  onClose,
  isSubmitting,
  error
}: {
  mode: "create" | "edit";
  form: UserFormState;
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>;
  onSubmit: () => void;
  onClose: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 px-4">
      <div
        data-testid={mode === "create" ? "create-user-modal" : "edit-user-modal"}
        className="w-full max-w-2xl rounded-[24px] border border-sky-100 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              {mode === "create" ? "Create User" : "Update User"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "create"
                ? "Provision a new application user and assign the operational role."
                : "Update role, active state, employee link, or reset the password."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Username</span>
            <input
              data-testid={`user-form-username-${mode}`}
              type="text"
              value={form.username}
              disabled={mode === "edit"}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              className="w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-sky-300 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
            <input
              data-testid={`user-form-email-${mode}`}
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-sky-300"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Role</span>
            <select
              data-testid={`user-form-role-${mode}`}
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))}
              className="w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-sky-300"
            >
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Employee ID</span>
            <input
              data-testid={`user-form-employee-id-${mode}`}
              type="text"
              value={form.employeeId}
              onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}
              placeholder="Optional UUID"
              className="w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-sky-300"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              {mode === "create" ? "Password" : "Reset Password"}
            </span>
            <input
              data-testid={`user-form-password-${mode}`}
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder={mode === "create" ? "Minimum 8 characters" : "Leave blank to keep current password"}
              className="w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-sky-300"
            />
          </label>
        </div>

        {mode === "edit" ? (
          <label className="mt-4 flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-slate-700">
            <input
              data-testid="user-form-is-active-edit"
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              className="h-4 w-4 rounded border-sky-300 text-sky-600 focus:ring-sky-500"
            />
            User is active
          </label>
        ) : null}

        {error ? (
          <div
            data-testid={`user-form-error-${mode}`}
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            data-testid={`btn-cancel-user-${mode}`}
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            data-testid={`btn-submit-user-${mode}`}
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-sky-300"
          >
            {isSubmitting
              ? "Submitting..."
              : mode === "create"
                ? "Create User"
                : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UserManagementPage() {
  const [filter, setFilter] = useState<UserFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [createForm, setCreateForm] = useState<UserFormState>(CREATE_FORM_DEFAULTS);
  const [editForm, setEditForm] = useState<UserFormState>(CREATE_FORM_DEFAULTS);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["managed-users"],
    queryFn: fetchManagedUsers
  });

  const users = data ?? [];
  const errorMessage = error instanceof Error ? error.message : error ? "Unknown error" : null;

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (filter === "ACTIVE" && !user.isActive) {
        return false;
      }
      if (filter === "INACTIVE" && user.isActive) {
        return false;
      }
      if (!searchTerm.trim()) {
        return true;
      }
      const term = searchTerm.trim().toLowerCase();
      return (
        user.username.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        roleLabel(user.role).toLowerCase().includes(term)
      );
    });
  }, [filter, searchTerm, users]);

  async function handleCreateUser() {
    const validationError = validateForm(createForm, "create");
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      await createManagedUser(buildCreatePayload(createForm));
      toast.success("User created.");
      setCreateForm(CREATE_FORM_DEFAULTS);
      setIsCreateOpen(false);
      await refetch();
    } catch (submitError) {
      setCreateError(submitError instanceof Error ? submitError.message : "Failed to create user.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdateUser() {
    if (!editingUser) {
      return;
    }

    const validationError = validateForm(editForm, "edit");
    if (validationError) {
      setEditError(validationError);
      return;
    }

    setIsUpdating(true);
    setEditError(null);
    try {
      await updateManagedUser(editingUser.id, buildUpdatePayload(editForm));
      toast.success("User updated.");
      setEditingUser(null);
      setEditForm(CREATE_FORM_DEFAULTS);
      await refetch();
    } catch (submitError) {
      setEditError(submitError instanceof Error ? submitError.message : "Failed to update user.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeactivateUser(user: ManagedUser) {
    if (!window.confirm(`Deactivate ${user.username}?`)) {
      return;
    }

    setDeactivatingUserId(user.id);
    try {
      await deactivateManagedUser(user.id);
      toast.success("User deactivated.");
      await refetch();
    } catch (deactivateError) {
      toast.error(deactivateError instanceof Error ? deactivateError.message : "Failed to deactivate user.");
    } finally {
      setDeactivatingUserId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400">
            Admin / <span className="font-medium text-sky-700">User Management</span>
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-800">User Management</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Provision application users, change roles, deactivate access, and reset passwords.
          </p>
        </div>
        <button
          data-testid="btn-create-user"
          type="button"
          onClick={() => {
            setCreateForm(CREATE_FORM_DEFAULTS);
            setCreateError(null);
            setIsCreateOpen(true);
          }}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          Create User
        </button>
      </section>

      {errorMessage ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Users", value: users.length },
          { label: "Active", value: users.filter((user) => user.isActive).length },
          { label: "Inactive", value: users.filter((user) => !user.isActive).length },
          { label: "Admin Accounts", value: users.filter((user) => user.role === "SUPER_ADMIN").length }
        ].map((item) => (
          <article key={item.label} className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">{isLoading ? "—" : item.value}</p>
          </article>
        ))}
      </section>

      <article className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-white px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", "ACTIVE", "INACTIVE"] as UserFilter[]).map((value) => (
              <button
                data-testid={`filter-users-${value.toLowerCase()}`}
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filter === value ? "bg-sky-600 text-white" : "text-slate-500 hover:bg-sky-50"
                }`}
              >
                {value === "ALL" ? "All Users" : value === "ACTIVE" ? "Active" : "Inactive"}
              </button>
            ))}
          </div>
          <input
            data-testid="user-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search username, email, or role"
            className="w-full max-w-xs rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-300"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-sky-50 bg-sky-50/50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-8 text-slate-500" colSpan={7}>Loading users...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-500" colSpan={7}>No users match the current filter.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    data-testid={`user-row-${user.id}`}
                    className="border-b border-sky-50 hover:bg-sky-50/40"
                  >
                    <td className="px-4 py-3">
                      <div data-testid={`user-username-${user.id}`} className="font-semibold text-slate-800">{user.username}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span data-testid={`user-role-${user.id}`} data-role={user.role}>
                        {roleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {user.employeeId ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        data-testid={`user-status-${user.id}`}
                        data-status={user.isActive ? "active" : "inactive"}
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          user.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{toLocalDate(user.createdAt)}</td>
                    <td className="px-4 py-3 text-slate-500">{toLocalDate(user.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          data-testid={`btn-edit-user-${user.id}`}
                          type="button"
                          onClick={() => {
                            setEditingUser(user);
                            setEditForm(toUserFormState(user));
                            setEditError(null);
                          }}
                          className="rounded-xl border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
                        >
                          Edit
                        </button>
                        <button
                          data-testid={`btn-deactivate-user-${user.id}`}
                          type="button"
                          onClick={() => void handleDeactivateUser(user)}
                          disabled={!user.isActive || deactivatingUserId === user.id}
                          className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                        >
                          {deactivatingUserId === user.id ? "Working..." : "Deactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      {isCreateOpen ? (
        <UserForm
          mode="create"
          form={createForm}
          setForm={setCreateForm}
          onSubmit={() => void handleCreateUser()}
          onClose={() => setIsCreateOpen(false)}
          isSubmitting={isCreating}
          error={createError}
        />
      ) : null}

      {editingUser ? (
        <UserForm
          mode="edit"
          form={editForm}
          setForm={setEditForm}
          onSubmit={() => void handleUpdateUser()}
          onClose={() => setEditingUser(null)}
          isSubmitting={isUpdating}
          error={editError}
        />
      ) : null}
    </div>
  );
}
