import { type FormEvent, useEffect, useState } from "react";
import { createVendorBusinessUnit, updateVendorBusinessUnit, uploadVendorBusinessUnitDocument } from "../../../lib/api";
import { useAppShellStore } from "../../../stores/appShellStore";
import type {
  CreateVendorBusinessUnitRequest,
  QualificationStatus,
  SiteType,
  UpdateVendorBusinessUnitRequest,
  VendorBusinessUnit,
  VendorDocumentType,
} from "../../../types/vendor-business-unit";
import { QUAL_STATUS_LABELS, SITE_TYPE_LABELS, VENDOR_DOCUMENT_TYPE_LABELS } from "../../../types/vendor-business-unit";

type Props = {
  open: boolean;
  vendorId: string;
  editTarget: VendorBusinessUnit | null;
  onClose: () => void;
  onSaved: (bu: VendorBusinessUnit) => void;
};

type FormState = {
  unitName: string;
  buCode: string;
  siteType: SiteType | "";
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  siteContactPerson: string;
  siteEmail: string;
  sitePhone: string;
  drugLicenseNumber: string;
  drugLicenseExpiry: string;
  gmpCertBody: string;
  gmpCertNumber: string;
  gmpCertExpiry: string;
  isWhoGmpCertified: boolean;
  isUsfda: boolean;
  isEuGmp: boolean;
  qualificationStatus: QualificationStatus | "";
  qualifiedDate: string;
  nextRequalificationDue: string;
  lastAuditDate: string;
  qaRating: string;
  deliveryScore: string;
  rejectionRate: string;
  openCapaCount: string;
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
    unitName: "", buCode: "", siteType: "", address: "", city: "", state: "", country: "",
    pincode: "",
    siteContactPerson: "", siteEmail: "", sitePhone: "",
    drugLicenseNumber: "", drugLicenseExpiry: "",
    gmpCertBody: "", gmpCertNumber: "", gmpCertExpiry: "",
    isWhoGmpCertified: false, isUsfda: false, isEuGmp: false,
    qualificationStatus: "", qualifiedDate: "", nextRequalificationDue: "",
    lastAuditDate: "", qaRating: "", deliveryScore: "", rejectionRate: "", openCapaCount: "",
  };
}

function fromBU(bu: VendorBusinessUnit): FormState {
  return {
    unitName:              bu.unitName,
    buCode:                bu.buCode ?? "",
    siteType:              bu.siteType ?? "",
    address:               bu.address ?? "",
    city:                  bu.city ?? "",
    state:                 bu.state ?? "",
    country:               bu.country ?? "",
    pincode:               bu.pincode ?? "",
    siteContactPerson:     bu.siteContactPerson ?? "",
    siteEmail:             bu.siteEmail ?? "",
    sitePhone:             bu.sitePhone ?? "",
    drugLicenseNumber:     bu.drugLicenseNumber ?? "",
    drugLicenseExpiry:     bu.drugLicenseExpiry ?? "",
    gmpCertBody:           bu.gmpCertBody ?? "",
    gmpCertNumber:         bu.gmpCertNumber ?? "",
    gmpCertExpiry:         bu.gmpCertExpiry ?? "",
    isWhoGmpCertified:     bu.isWhoGmpCertified,
    isUsfda:               bu.isUsfda,
    isEuGmp:               bu.isEuGmp,
    qualificationStatus:   bu.qualificationStatus ?? "",
    qualifiedDate:         bu.qualifiedDate ?? "",
    nextRequalificationDue: bu.nextRequalificationDue ?? "",
    lastAuditDate:         bu.lastAuditDate ?? "",
    qaRating:              bu.qaRating != null ? String(bu.qaRating) : "",
    deliveryScore:         bu.deliveryScore != null ? String(bu.deliveryScore) : "",
    rejectionRate:         bu.rejectionRate != null ? String(bu.rejectionRate) : "",
    openCapaCount:         bu.openCapaCount != null ? String(bu.openCapaCount) : "",
  };
}

export function VendorBUFormDrawer({ open, vendorId, editTarget, onClose, onSaved }: Props) {
  const currentUser = useAppShellStore((s) => s.currentUser.name);
  const isEdit = editTarget !== null;

  const [form, setForm] = useState<FormState>(makeBlankForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [draftDocuments, setDraftDocuments] = useState<DraftDocument[]>([]);
  const [documentDraft, setDocumentDraft] = useState({
    documentTitle: "",
    documentType: "GMP_CERTIFICATE" as VendorDocumentType,
    expiryDate: "",
    file: null as File | null
  });

  useEffect(() => {
    if (open) {
      setForm(isEdit ? fromBU(editTarget!) : makeBlankForm());
      setErrors({});
      setApiError(null);
      setDraftDocuments([]);
      setDocumentDraft({
        documentTitle: "",
        documentType: "GMP_CERTIFICATE",
        expiryDate: "",
        file: null
      });
    }
  }, [open, editTarget]);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.unitName.trim()) next.unitName = "Site name is required";
    if (form.siteEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.siteEmail))
      next.siteEmail = "Enter a valid email address";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function addDraftDocument() {
    if (!documentDraft.documentTitle.trim()) {
      setApiError("Document title is required before adding a site document.");
      return;
    }
    if (!documentDraft.file) {
      setApiError("Choose a file before adding a site document.");
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
      documentType: "GMP_CERTIFICATE",
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
      throw new Error("Document title is required before saving the site.");
    }
    if (!documentDraft.file) {
      throw new Error("Choose a file or remove the pending document before saving the site.");
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

    try {
      const pendingDocuments = resolvePendingDocuments();
      let saved: VendorBusinessUnit;
      if (isEdit) {
        const payload: UpdateVendorBusinessUnitRequest = {
          unitName:              form.unitName.trim(),
          buCode:                form.buCode.trim() || undefined,
          siteType:              (form.siteType || undefined) as SiteType | undefined,
          address:               form.address.trim() || undefined,
          city:                  form.city.trim() || undefined,
          state:                 form.state.trim() || undefined,
          country:               form.country.trim() || undefined,
          pincode:               form.pincode.trim() || undefined,
          siteContactPerson:     form.siteContactPerson.trim() || undefined,
          siteEmail:             form.siteEmail.trim() || undefined,
          sitePhone:             form.sitePhone.trim() || undefined,
          drugLicenseNumber:     form.drugLicenseNumber.trim() || undefined,
          drugLicenseExpiry:     form.drugLicenseExpiry || undefined,
          gmpCertBody:           form.gmpCertBody.trim() || undefined,
          gmpCertNumber:         form.gmpCertNumber.trim() || undefined,
          gmpCertExpiry:         form.gmpCertExpiry || undefined,
          isWhoGmpCertified:     form.isWhoGmpCertified,
          isUsfda:               form.isUsfda,
          isEuGmp:               form.isEuGmp,
          qualificationStatus:   (form.qualificationStatus || undefined) as QualificationStatus | undefined,
          qualifiedDate:         form.qualifiedDate || undefined,
          nextRequalificationDue: form.nextRequalificationDue || undefined,
          lastAuditDate:         form.lastAuditDate || undefined,
          qaRating:              form.qaRating ? Number(form.qaRating) : undefined,
          deliveryScore:         form.deliveryScore ? Number(form.deliveryScore) : undefined,
          rejectionRate:         form.rejectionRate ? Number(form.rejectionRate) : undefined,
          openCapaCount:         form.openCapaCount ? Number(form.openCapaCount) : undefined,
          updatedBy:             currentUser,
        };
        saved = await updateVendorBusinessUnit(vendorId, editTarget!.id, payload);
      } else {
        const payload: CreateVendorBusinessUnitRequest = {
          unitName:          form.unitName.trim(),
          buCode:            form.buCode.trim() || undefined,
          siteType:          (form.siteType || undefined) as SiteType | undefined,
          address:           form.address.trim() || undefined,
          city:              form.city.trim() || undefined,
          state:             form.state.trim() || undefined,
          country:           form.country.trim() || undefined,
          pincode:           form.pincode.trim() || undefined,
          siteContactPerson: form.siteContactPerson.trim() || undefined,
          siteEmail:         form.siteEmail.trim() || undefined,
          sitePhone:         form.sitePhone.trim() || undefined,
          drugLicenseNumber: form.drugLicenseNumber.trim() || undefined,
          drugLicenseExpiry: form.drugLicenseExpiry || undefined,
          gmpCertBody:       form.gmpCertBody.trim() || undefined,
          gmpCertNumber:     form.gmpCertNumber.trim() || undefined,
          gmpCertExpiry:     form.gmpCertExpiry || undefined,
          isWhoGmpCertified: form.isWhoGmpCertified,
          isUsfda:           form.isUsfda,
          isEuGmp:           form.isEuGmp,
          qualifiedDate:     form.qualifiedDate || undefined,
          nextRequalificationDue: form.nextRequalificationDue || undefined,
          lastAuditDate:     form.lastAuditDate || undefined,
          qaRating:          form.qaRating ? Number(form.qaRating) : undefined,
          deliveryScore:     form.deliveryScore ? Number(form.deliveryScore) : undefined,
          rejectionRate:     form.rejectionRate ? Number(form.rejectionRate) : undefined,
          openCapaCount:     form.openCapaCount ? Number(form.openCapaCount) : undefined,
          createdBy:         currentUser,
        };
        saved = await createVendorBusinessUnit(vendorId, payload);
      }
      const uploadResults = await Promise.allSettled(
        pendingDocuments.map((document) =>
          uploadVendorBusinessUnitDocument(saved.id, {
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
        window.alert(`Site saved, but ${failedUploads} compliance document upload(s) failed. Re-open the site to retry those files.`);
      }
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Failed to save business unit");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = (field: keyof FormState) => [
    "w-full rounded-xl border px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition",
    "focus:border-orange-400 focus:ring-2 focus:ring-orange-100",
    errors[field] ? "border-red-300 bg-red-50" : "border-orange-200 bg-white"
  ].join(" ");

  const baseInput = "w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

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
          "fixed inset-y-0 right-0 z-50 flex w-[520px] flex-col bg-white shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {isEdit ? "Edit Business Unit" : "Add Manufacturing Site"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {isEdit
                ? `Editing ${editTarget!.buCode ?? editTarget!.unitName}`
                : "Register a new site / BU under this vendor"}
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
        <form id="vbu-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {apiError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{apiError}</div>
          )}

          {/* Section: Site Identity */}
          <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-4 pt-3 pb-4 space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">Site Identity</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Site Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.unitName} onChange={(e) => set("unitName", e.target.value)}
                  placeholder="e.g. Granules Gagillapur Unit" className={inputCls("unitName")} />
                {errors.unitName && <p className="mt-1 text-[11px] text-red-500">{errors.unitName}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">BU Code</label>
                <input type="text" value={form.buCode} onChange={(e) => set("buCode", e.target.value.toUpperCase())}
                  placeholder="e.g. GRA-UNIT-01" className={baseInput} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Site Type</label>
              <select value={form.siteType} onChange={(e) => set("siteType", e.target.value as SiteType | "")}
                className={baseInput}>
                <option value="">Select site type…</option>
                {(Object.keys(SITE_TYPE_LABELS) as SiteType[]).map((k) => (
                  <option key={k} value={k}>{SITE_TYPE_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Site Address */}
          <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-4 pt-3 pb-4 space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">Address</div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Street Address</label>
              <input type="text" value={form.address} onChange={(e) => set("address", e.target.value)}
                placeholder="Plot 42, APIIC Industrial Park" className={baseInput} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">City</label>
                <input type="text" value={form.city} onChange={(e) => set("city", e.target.value)}
                  placeholder="Hyderabad" className={baseInput} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">State</label>
                <input type="text" value={form.state} onChange={(e) => set("state", e.target.value)}
                  placeholder="Telangana" className={baseInput} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Country</label>
                <input type="text" value={form.country} onChange={(e) => set("country", e.target.value)}
                  placeholder="India" className={baseInput} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Pincode</label>
              <input type="text" value={form.pincode} onChange={(e) => set("pincode", e.target.value)}
                placeholder="500043" className={baseInput} />
            </div>
          </div>

          <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-4 pt-3 pb-4 space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">Compliance Documents</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Document Title</label>
                <input
                  type="text"
                  value={documentDraft.documentTitle}
                  onChange={(e) => setDocumentDraft((current) => ({ ...current, documentTitle: e.target.value }))}
                  placeholder="e.g. WHO GMP Certificate"
                  className={baseInput}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Document Type</label>
                <select
                  value={documentDraft.documentType}
                  onChange={(e) => setDocumentDraft((current) => ({ ...current, documentType: e.target.value as VendorDocumentType }))}
                  className={baseInput}
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
                  className={baseInput}
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
              <div className="text-[11px] text-slate-500">Files are staged locally and uploaded when you save the site.</div>
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
                  No site documents queued yet.
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
                Existing uploaded site documents remain attached to this VBU. New files added here are uploaded on save.
              </p>
            )}
          </div>

          {/* Section: Site Contact */}
          <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-4 pt-3 pb-4 space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">Site Contact</div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Contact Person</label>
              <input type="text" value={form.siteContactPerson} onChange={(e) => set("siteContactPerson", e.target.value)}
                placeholder="e.g. Dr. Priya Sharma" className={baseInput} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Email</label>
                <input type="email" value={form.siteEmail} onChange={(e) => set("siteEmail", e.target.value)}
                  placeholder="site@vendor.com" className={inputCls("siteEmail")} />
                {errors.siteEmail && <p className="mt-1 text-[11px] text-red-500">{errors.siteEmail}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Phone</label>
                <input type="text" value={form.sitePhone} onChange={(e) => set("sitePhone", e.target.value)}
                  placeholder="+91 40 2345 6789" className={baseInput} />
              </div>
            </div>
          </div>

          {/* Section: Drug License */}
          <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-4 pt-3 pb-4 space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">Drug License (CDSCO / Form 28)</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">License Number</label>
                <input type="text" value={form.drugLicenseNumber} onChange={(e) => set("drugLicenseNumber", e.target.value)}
                  placeholder="TG/MFG/2019/001234" className={baseInput} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Expiry Date</label>
                <input type="date" value={form.drugLicenseExpiry} onChange={(e) => set("drugLicenseExpiry", e.target.value)}
                  className={baseInput} />
              </div>
            </div>
          </div>

          {/* Section: GMP Certification */}
          <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-4 pt-3 pb-4 space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">GMP Certification</div>

            {/* GMP cert checkboxes */}
            <div className="flex gap-4">
              {([
                { field: "isWhoGmpCertified" as const, label: "WHO-GMP" },
                { field: "isUsfda"           as const, label: "USFDA"   },
                { field: "isEuGmp"           as const, label: "EU-GMP"  },
              ]).map(({ field, label }) => (
                <label key={field} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form[field]}
                    onChange={(e) => set(field, e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-orange-300 text-orange-600 focus:ring-orange-400"
                  />
                  <span className="text-xs font-semibold text-slate-700">{label}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Certifying Body</label>
                <input type="text" value={form.gmpCertBody} onChange={(e) => set("gmpCertBody", e.target.value)}
                  placeholder="e.g. WHO, USFDA, EDQM" className={baseInput} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Certificate Number</label>
                <input type="text" value={form.gmpCertNumber} onChange={(e) => set("gmpCertNumber", e.target.value)}
                  placeholder="WHO-GMP-2024-1234" className={baseInput} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Certificate Expiry</label>
              <input type="date" value={form.gmpCertExpiry} onChange={(e) => set("gmpCertExpiry", e.target.value)}
                className={baseInput} />
            </div>
          </div>

          <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-4 pt-3 pb-4 space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">Qualification & Performance</div>
            {isEdit && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Status</label>
                <select
                  value={form.qualificationStatus}
                  onChange={(e) => set("qualificationStatus", e.target.value as QualificationStatus | "")}
                  className={baseInput}
                >
                  <option value="">Keep current</option>
                  {(Object.keys(QUAL_STATUS_LABELS) as QualificationStatus[]).map((k) => (
                    <option key={k} value={k}>{QUAL_STATUS_LABELS[k]}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Qualified Date</label>
                <input type="date" value={form.qualifiedDate} onChange={(e) => set("qualifiedDate", e.target.value)} className={baseInput} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Next Requalification</label>
                <input type="date" value={form.nextRequalificationDue} onChange={(e) => set("nextRequalificationDue", e.target.value)} className={baseInput} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Last Audit</label>
                <input type="date" value={form.lastAuditDate} onChange={(e) => set("lastAuditDate", e.target.value)} className={baseInput} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Open CAPAs</label>
                <input type="number" min="0" step="1" value={form.openCapaCount} onChange={(e) => set("openCapaCount", e.target.value)} className={baseInput} placeholder="0" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">QA Rating</label>
                <input type="number" min="0" max="5" step="0.1" value={form.qaRating} onChange={(e) => set("qaRating", e.target.value)} className={baseInput} placeholder="4.2" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Delivery Rating (%)</label>
                <input type="number" min="0" max="100" step="0.01" value={form.deliveryScore} onChange={(e) => set("deliveryScore", e.target.value)} className={baseInput} placeholder="96.5" />
              </div>
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Rejection Rate (%)</label>
                <input type="number" min="0" max="100" step="0.01" value={form.rejectionRate} onChange={(e) => set("rejectionRate", e.target.value)} className={baseInput} placeholder="1.20" />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-orange-100 bg-white px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" form="vbu-form" disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
            {saving && (
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Site"}
          </button>
        </div>
      </div>
    </>
  );
}
