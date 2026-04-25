import { type FormEvent, useEffect, useState } from "react";
import { createVendor, updateVendor, updateVendorApproval, uploadVendorDocument } from "../../../lib/api";
import { useAppShellStore } from "../../../stores/appShellStore";
import type { CreateVendorRequest, Vendor, VendorCategory } from "../../../types/vendor";
import { VENDOR_CATEGORY_LABELS } from "../../../types/vendor";
import { VENDOR_DOCUMENT_TYPE_LABELS, type VendorDocumentType } from "../../../types/vendor-business-unit";

type Props = {
  open: boolean;
  editTarget: Vendor | null;
  onClose: () => void;
  onSaved: (vendor: Vendor) => void;
};

type FormState = {
  vendorCode: string;
  vendorName: string;
  contactPerson: string;
  email: string;
  phone: string;
  vendorCategory: VendorCategory | "";
  corporateAddress: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  gstin: string;
  pan: string;
  website: string;
  paymentTermsDays: string;
  approvedSince: string;
  lastAuditDate: string;
  nextAuditDue: string;
  qaRating: string;
  deliveryScore: string;
  rejectionRate: string;
  openCapaCount: string;
  hasNoBusinessUnits: boolean;
  initialApprovalStatus: "UNDER_REVIEW" | "APPROVED";
};

type DraftDocument = {
  id: string;
  documentTitle: string;
  documentType: VendorDocumentType;
  expiryDate: string;
  file: File;
};

function makeBlankForm(): FormState {
  return {
    vendorCode: "", vendorName: "", contactPerson: "", email: "", phone: "",
    vendorCategory: "", corporateAddress: "", city: "", state: "", country: "", pincode: "",
    gstin: "", pan: "", website: "", paymentTermsDays: "",
    approvedSince: "", lastAuditDate: "", nextAuditDue: "", qaRating: "",
    deliveryScore: "", rejectionRate: "", openCapaCount: "",
    hasNoBusinessUnits: false, initialApprovalStatus: "UNDER_REVIEW"
  };
}

function fromVendor(v: Vendor): FormState {
  return {
    vendorCode:      v.vendorCode,
    vendorName:      v.vendorName,
    contactPerson:   v.contactPerson ?? "",
    email:           v.email ?? "",
    phone:           v.phone ?? "",
    vendorCategory:  v.vendorCategory ?? "",
    corporateAddress: v.corporateAddress ?? "",
    city:            v.city ?? "",
    state:           v.state ?? "",
    country:         v.country ?? "",
    pincode:         v.pincode ?? "",
    gstin:           v.gstin ?? "",
    pan:             v.pan ?? "",
    website:         v.website ?? "",
    paymentTermsDays: v.paymentTermsDays != null ? String(v.paymentTermsDays) : "",
    approvedSince:   v.approvedSince ?? "",
    lastAuditDate:   v.lastAuditDate ?? "",
    nextAuditDue:    v.nextAuditDue ?? "",
    qaRating:        v.qaRating != null ? String(v.qaRating) : "",
    deliveryScore:   v.deliveryScore != null ? String(v.deliveryScore) : "",
    rejectionRate:   v.rejectionRate != null ? String(v.rejectionRate) : "",
    openCapaCount:   v.openCapaCount != null ? String(v.openCapaCount) : "",
    hasNoBusinessUnits: false,
    initialApprovalStatus: v.isApproved ? "APPROVED" : "UNDER_REVIEW",
  };
}

export function VendorFormDrawer({ open, editTarget, onClose, onSaved }: Props) {
  const currentUser = useAppShellStore((s) => s.currentUser.name);
  const isEdit = editTarget !== null;

  const [form, setForm] = useState<FormState>(makeBlankForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [draftDocuments, setDraftDocuments] = useState<DraftDocument[]>([]);
  const [documentDraft, setDocumentDraft] = useState({
    documentTitle: "",
    documentType: "COMPANY_REGISTRATION" as VendorDocumentType,
    expiryDate: "",
    file: null as File | null
  });

  useEffect(() => {
    if (open) {
      setForm(isEdit ? fromVendor(editTarget!) : makeBlankForm());
      setErrors({});
      setApiError(null);
      setDraftDocuments([]);
      setDocumentDraft({
        documentTitle: "",
        documentType: "COMPANY_REGISTRATION",
        expiryDate: "",
        file: null
      });
    }
  }, [open, editTarget]);

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.vendorCode.trim()) next.vendorCode = "Vendor code is required";
    if (!form.vendorName.trim()) next.vendorName = "Vendor name is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "Enter a valid email address";
    if (form.paymentTermsDays && isNaN(Number(form.paymentTermsDays)))
      next.paymentTermsDays = "Must be a number";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function addDraftDocument() {
    if (!documentDraft.documentTitle.trim()) {
      setApiError("Corporate document title is required before adding a file.");
      return;
    }
    if (!documentDraft.file) {
      setApiError("Choose a file before adding a corporate document.");
      return;
    }
    const file = documentDraft.file;
    setDraftDocuments((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        documentTitle: documentDraft.documentTitle.trim(),
        documentType: documentDraft.documentType,
        expiryDate: documentDraft.expiryDate,
        file
      }
    ]);
    setDocumentDraft({
      documentTitle: "",
      documentType: "COMPANY_REGISTRATION",
      expiryDate: "",
      file: null
    });
    setApiError(null);
  }

  function removeDraftDocument(id: string) {
    setDraftDocuments((current) => current.filter((document) => document.id !== id));
  }

  function resolvePendingDocuments() {
    if (!documentDraft.documentTitle.trim() && !documentDraft.file) {
      return draftDocuments;
    }
    if (!documentDraft.documentTitle.trim()) {
      throw new Error("Document title is required before saving the vendor.");
    }
    if (!documentDraft.file) {
      throw new Error("Choose a file or remove the pending document before saving the vendor.");
    }
    return [
      ...draftDocuments,
      {
        id: crypto.randomUUID(),
        documentTitle: documentDraft.documentTitle.trim(),
        documentType: documentDraft.documentType,
        expiryDate: documentDraft.expiryDate,
        file: documentDraft.file
      }
    ];
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError(null);

    const payload: CreateVendorRequest = {
      vendorCode:      form.vendorCode.trim(),
      vendorName:      form.vendorName.trim(),
      contactPerson:   form.contactPerson.trim() || undefined,
      email:           form.email.trim() || undefined,
      phone:           form.phone.trim() || undefined,
      vendorCategory:  form.vendorCategory || undefined,
      corporateAddress: form.corporateAddress.trim() || undefined,
      city:            form.city.trim() || undefined,
      state:           form.state.trim() || undefined,
      country:         form.country.trim() || undefined,
      pincode:         form.pincode.trim() || undefined,
      gstin:           form.gstin.trim() || undefined,
      pan:             form.pan.trim() || undefined,
      website:         form.website.trim() || undefined,
      paymentTermsDays: form.paymentTermsDays ? Number(form.paymentTermsDays) : undefined,
      approvedSince:   form.approvedSince || undefined,
      lastAuditDate:   form.lastAuditDate || undefined,
      nextAuditDue:    form.nextAuditDue || undefined,
      qaRating:        form.qaRating ? Number(form.qaRating) : undefined,
      deliveryScore:   form.deliveryScore ? Number(form.deliveryScore) : undefined,
      rejectionRate:   form.rejectionRate ? Number(form.rejectionRate) : undefined,
      openCapaCount:   form.openCapaCount ? Number(form.openCapaCount) : undefined,
      createdBy:       currentUser,
    };

    try {
      const pendingDocuments = resolvePendingDocuments();
      let saved = isEdit
        ? await updateVendor(editTarget!.id, payload)
        : await createVendor(payload);
      if (!isEdit && form.hasNoBusinessUnits && form.initialApprovalStatus === "APPROVED") {
        saved = await updateVendorApproval(saved.id, {
          approved: true,
          approvedSince: form.approvedSince || new Date().toISOString().slice(0, 10),
        });
      }
      const uploadResults = await Promise.allSettled(
        pendingDocuments.map((document) =>
          uploadVendorDocument(saved.id, {
            documentTitle: document.documentTitle,
            documentType: document.documentType,
            expiryDate: document.expiryDate || undefined,
            file: document.file
          })
        )
      );
      const failedUploads = uploadResults.filter((result) => result.status === "rejected").length;
      onSaved(saved);
      if (failedUploads > 0) {
        window.alert(`Vendor saved, but ${failedUploads} corporate document upload(s) failed. Re-open the vendor to retry those files.`);
      }
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Failed to save vendor");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = (field: keyof FormState) => [
    "w-full rounded-xl border px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition",
    "focus:border-orange-400 focus:ring-2 focus:ring-orange-100",
    errors[field] ? "border-red-300 bg-red-50" : "border-orange-200 bg-white"
  ].join(" ");

  return (
    <>
      <div
        className={[
          "fixed inset-0 z-40 bg-black/30 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        ].join(" ")}
        onClick={onClose}
      />
      <div
        className={[
          "fixed inset-y-0 right-0 z-50 flex w-[460px] flex-col bg-white shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {isEdit ? "Edit Vendor" : "Add New Vendor"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {isEdit ? `Editing ${editTarget!.vendorCode}` : "Register a new vendor in the system"}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form id="vendor-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {apiError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{apiError}</div>
          )}

          {/* Section: Identity */}
          <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-4 pt-3 pb-4 space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">Identity</div>

            <div className="grid grid-cols-2 gap-3">
              {/* Vendor Code */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Vendor Code <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.vendorCode} onChange={(e) => set("vendorCode", e.target.value)}
                  disabled={isEdit} placeholder="VEN-0042"
                  className={[inputCls("vendorCode"), isEdit ? "cursor-not-allowed bg-slate-50 text-slate-400" : ""].join(" ")} />
                {errors.vendorCode && <p className="mt-1 text-[11px] text-red-500">{errors.vendorCode}</p>}
                {isEdit && <p className="mt-1 text-[11px] text-slate-400">Cannot change after creation.</p>}
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Category</label>
                <select value={form.vendorCategory} onChange={(e) => set("vendorCategory", e.target.value)}
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100">
                  <option value="">Select category…</option>
                  {(Object.keys(VENDOR_CATEGORY_LABELS) as VendorCategory[]).map((k) => (
                    <option key={k} value={k}>{VENDOR_CATEGORY_LABELS[k]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vendor Name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Vendor Name <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.vendorName} onChange={(e) => set("vendorName", e.target.value)}
                placeholder="e.g. Granules India Ltd." className={inputCls("vendorName")} />
              {errors.vendorName && <p className="mt-1 text-[11px] text-red-500">{errors.vendorName}</p>}
            </div>
          </div>

          {!isEdit && (
            <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-4 pt-3 pb-4 space-y-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">Site Structure</div>
              <label className="flex items-start gap-3 rounded-xl border border-orange-100 bg-white px-3 py-3">
                <input
                  type="checkbox"
                  checked={form.hasNoBusinessUnits}
                  onChange={(e) => setForm((current) => ({ ...current, hasNoBusinessUnits: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-400"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-700">This vendor currently has no VBU / site records</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Use vendor-level approval and documents first. A site can be added later from the VBU page.
                  </div>
                </div>
              </label>
              {form.hasNoBusinessUnits && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Initial Approval Status</label>
                  <select
                    value={form.initialApprovalStatus}
                    onChange={(e) => setForm((current) => ({
                      ...current,
                      initialApprovalStatus: e.target.value as "UNDER_REVIEW" | "APPROVED"
                    }))}
                    className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="APPROVED">Approved</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Section: Contact */}
          <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-4 pt-3 pb-4 space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">Contact</div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Contact Person</label>
              <input type="text" value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Email</label>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                  placeholder="procurement@vendor.com" className={inputCls("email")} />
                {errors.email && <p className="mt-1 text-[11px] text-red-500">{errors.email}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Phone</label>
                <input type="text" value={form.phone} onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Website</label>
              <input type="text" value={form.website} onChange={(e) => set("website", e.target.value)}
                placeholder="https://vendor.com"
                className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </div>
          </div>

          <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-4 pt-3 pb-4 space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">Vendor Location</div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Vendor Address</label>
              <textarea
                value={form.corporateAddress}
                onChange={(e) => set("corporateAddress", e.target.value)}
                rows={3}
                placeholder="Registered office / corporate address"
                className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Hyderabad"
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  placeholder="Telangana"
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Country</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                  placeholder="India"
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => set("pincode", e.target.value)}
                  placeholder="500043"
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>
          </div>

          {/* Section: Regulatory */}
          <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-4 pt-3 pb-4 space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">Regulatory (India)</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">GSTIN</label>
                <input type="text" value={form.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5" maxLength={15}
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">PAN</label>
                <input type="text" value={form.pan} onChange={(e) => set("pan", e.target.value.toUpperCase())}
                  placeholder="AAAAA0000A" maxLength={10}
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Payment Terms (days)</label>
              <input type="number" value={form.paymentTermsDays} onChange={(e) => set("paymentTermsDays", e.target.value)}
                placeholder="30" min={0} max={365}
                className={inputCls("paymentTermsDays")} />
              {errors.paymentTermsDays && <p className="mt-1 text-[11px] text-red-500">{errors.paymentTermsDays}</p>}
            </div>
          </div>

          <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-4 pt-3 pb-4 space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">Corporate Documents</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Document Title</label>
                <input
                  type="text"
                  value={documentDraft.documentTitle}
                  onChange={(e) => setDocumentDraft((current) => ({ ...current, documentTitle: e.target.value }))}
                  placeholder="e.g. GST Registration"
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Document Type</label>
                <select
                  value={documentDraft.documentType}
                  onChange={(e) => setDocumentDraft((current) => ({ ...current, documentType: e.target.value as VendorDocumentType }))}
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                >
                  {(Object.keys(VENDOR_DOCUMENT_TYPE_LABELS) as VendorDocumentType[]).map((key) => (
                    <option key={key} value={key}>{VENDOR_DOCUMENT_TYPE_LABELS[key]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Expiry Date</label>
                <input
                  type="date"
                  value={documentDraft.expiryDate}
                  onChange={(e) => setDocumentDraft((current) => ({ ...current, expiryDate: e.target.value }))}
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">File</label>
                <input
                  type="file"
                  onChange={(e) => setDocumentDraft((current) => ({ ...current, file: e.target.files?.[0] ?? null }))}
                  className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-orange-700"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-orange-100 bg-white px-3 py-2">
              <div className="text-[11px] text-slate-500">Files are staged locally and uploaded when you save the vendor.</div>
              <button
                type="button"
                onClick={addDraftDocument}
                className="rounded-lg border border-orange-200 px-3 py-1.5 text-[11px] font-semibold text-orange-700 hover:bg-orange-50"
              >
                Add Document
              </button>
            </div>
            <div className="space-y-2">
              {draftDocuments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-orange-200 px-3 py-4 text-center text-[11px] text-slate-400">
                  No corporate documents queued yet.
                </div>
              ) : (
                draftDocuments.map((document) => (
                  <div key={document.id} className="flex items-center justify-between rounded-xl border border-orange-100 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-slate-800">{document.documentTitle}</div>
                      <div className="text-[10px] text-slate-500">
                        {VENDOR_DOCUMENT_TYPE_LABELS[document.documentType]} · {document.file.name}
                        {document.expiryDate ? ` · Exp ${document.expiryDate}` : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDraftDocument(document.id)}
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
            {isEdit && (
              <p className="text-[11px] text-slate-500">
                Existing uploaded corporate documents remain on the vendor. New files added here are uploaded on save.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-4 pt-3 pb-4 space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">Audit & Performance</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Approved Since</label>
                <input type="date" value={form.approvedSince} onChange={(e) => set("approvedSince", e.target.value)} className={inputCls("approvedSince")} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Last Audit Date</label>
                <input type="date" value={form.lastAuditDate} onChange={(e) => set("lastAuditDate", e.target.value)} className={inputCls("lastAuditDate")} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Next Audit Due</label>
                <input type="date" value={form.nextAuditDue} onChange={(e) => set("nextAuditDue", e.target.value)} className={inputCls("nextAuditDue")} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">QA Rating</label>
                <input type="number" min="0" max="5" step="0.1" value={form.qaRating} onChange={(e) => set("qaRating", e.target.value)} className={inputCls("qaRating")} placeholder="4.2" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Delivery Score (%)</label>
                <input type="number" min="0" max="100" step="0.01" value={form.deliveryScore} onChange={(e) => set("deliveryScore", e.target.value)} className={inputCls("deliveryScore")} placeholder="96.5" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Rejection Rate (%)</label>
                <input type="number" min="0" max="100" step="0.01" value={form.rejectionRate} onChange={(e) => set("rejectionRate", e.target.value)} className={inputCls("rejectionRate")} placeholder="1.20" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Open CAPAs</label>
                <input type="number" min="0" step="1" value={form.openCapaCount} onChange={(e) => set("openCapaCount", e.target.value)} className={inputCls("openCapaCount")} placeholder="0" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-[11px] text-orange-700">
            {!isEdit && form.hasNoBusinessUnits && form.initialApprovalStatus === "APPROVED"
              ? <>This vendor will be created without sites and immediately marked <strong>Approved</strong> at the vendor level.</>
              : <>After saving, vendor status will be <strong>Under Review</strong> until a QA officer approves the qualification.</>}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-orange-100 bg-white px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" form="vendor-form" disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
            {saving && (
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Vendor"}
          </button>
        </div>
      </div>
    </>
  );
}
