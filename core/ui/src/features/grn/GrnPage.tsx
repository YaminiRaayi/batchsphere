import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppShellStore } from "../../stores/appShellStore";
import {
  cancelGrn,
  createGrn,
  fetchBatches,
  fetchContainerLabels,
  fetchGrnById,
  fetchGrnLabelPrintData,
  fetchGrns,
  fetchGrnItemContainers,
  fetchMaterials,
  fetchPallets,
  fetchSuppliers,
  fetchVendorBusinessUnits,
  fetchVendors,
  receiveGrn,
  uploadGrnDocument
} from "../../lib/api";
import type { Batch } from "../../types/batch";
import type { Material } from "../../types/material";
import type { Pallet } from "../../types/location";
import type { Supplier } from "../../types/supplier";
import type {
  ContainerType,
  CreateGrnRequest,
  CreateGrnItemRequest,
  Grn,
  GrnContainer,
  GrnLabelPrintData,
  MaterialLabel,
  PageResponse,
  QcStatus
} from "../../types/grn";
import type { VendorBusinessUnit } from "../../types/vendor-business-unit";
import type { Vendor } from "../../types/vendor";

type DocumentDraft = {
  documentName: string;
  documentType: string;
  documentUrl: string;
  file: File | null;
};

type CancelDraft = {
  grnId: string;
  grnNumber: string;
};

type QueueFilter = "ALL" | Grn["status"];

function formatQuantity(value: number, uom: string) {
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value)} ${uom}`;
}

function summarizeMaterials(grn: Grn) {
  const materialCount = grn.items.length;
  return materialCount === 1 ? "1 line item" : `${materialCount} line items`;
}

function sumQuantity(grn: Grn, key: "receivedQuantity" | "acceptedQuantity") {
  const total = grn.items.reduce((sum, item) => sum + (item[key] ?? 0), 0);
  const primaryUom = grn.items[0]?.uom ?? "";
  return formatQuantity(total, primaryUom);
}

function statusPill(status: Grn["status"]) {
  switch (status) {
    case "RECEIVED":
      return "bg-green-100 text-green-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    case "DRAFT":
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function formatDisplayDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatDisplayDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function escapePrintHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildLabelPrintHtml(data: GrnLabelPrintData) {
  const entries = data.entries
    .map(
      (entry) => `
        <article class="label-card">
          <div class="meta">GRN ${escapePrintHtml(data.grnNumber)} • Line ${entry.lineNumber}</div>
          <h2>${escapePrintHtml(entry.materialName)}</h2>
          <p><strong>Container:</strong> ${escapePrintHtml(entry.containerNumber)}</p>
          <p><strong>Pallet:</strong> ${escapePrintHtml(entry.palletCode)}</p>
          <p><strong>Batch:</strong> ${escapePrintHtml(entry.batchNumber ?? "Pending")}</p>
          <p><strong>Qty:</strong> ${entry.quantity} ${escapePrintHtml(entry.uom)}</p>
          <pre>${escapePrintHtml(entry.labelContent)}</pre>
        </article>
      `
    )
    .join("");

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>GRN ${escapePrintHtml(data.grnNumber)} Labels</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
        h1 { margin: 0 0 8px; font-size: 24px; }
        .sub { margin: 0 0 24px; color: #475569; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
        .label-card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; break-inside: avoid; }
        .label-card h2 { margin: 0 0 12px; font-size: 18px; }
        .label-card p { margin: 6px 0; font-size: 14px; }
        .label-card pre { margin: 12px 0 0; white-space: pre-wrap; font-size: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; }
        .meta { margin-bottom: 8px; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }
        @media print { body { margin: 12mm; } }
      </style>
    </head>
    <body>
      <h1>GRN Label Print</h1>
      <p class="sub">GRN ${escapePrintHtml(data.grnNumber)} • Receipt ${escapePrintHtml(data.receiptDate)}</p>
      <section class="grid">${entries}</section>
    </body>
  </html>`;
}

const containerTypes: ContainerType[] = ["BAG", "DRUM", "BOX", "CAN", "BOTTLE", "FIBER_DRUM"];
const qcStatuses: QcStatus[] = ["PENDING", "APPROVED", "REJECTED", "PARTIALLY_APPROVED"];
const PAGE_SIZE = 15;

function createEmptyGrnItem(): CreateGrnItemRequest {
  return {
    materialId: "",
    receivedQuantity: 0,
    acceptedQuantity: 0,
    rejectedQuantity: 0,
    uom: "KG",
    palletId: "",
    containerType: "BAG",
    numberOfContainers: 1,
    quantityPerContainer: 0,
    vendorBatch: "",
    manufactureDate: "",
    expiryDate: "",
    retestDate: "",
    unitPrice: 0,
    qcStatus: "PENDING",
    description: ""
  };
}

function createInitialForm(currentUserName: string): CreateGrnRequest {
  return {
    grnNumber: "",
    supplierId: "",
    vendorId: "",
    vendorBusinessUnitId: "",
    receiptDate: new Date().toISOString().slice(0, 10),
    invoiceNumber: "",
    remarks: "",
    createdBy: currentUserName,
    items: [createEmptyGrnItem()]
  };
}

export function GrnPage() {
  const currentUserName = useAppShellStore((state) => state.currentUser.name);
  const [page, setPage] = useState<PageResponse<Grn> | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isQueueVisible, setIsQueueVisible] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorBusinessUnits, setVendorBusinessUnits] = useState<VendorBusinessUnit[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [form, setForm] = useState<CreateGrnRequest>(() => createInitialForm(currentUserName));
  const [selectedGrn, setSelectedGrn] = useState<Grn | null>(null);
  const [itemContainers, setItemContainers] = useState<Record<string, GrnContainer[]>>({});
  const [containerLabels, setContainerLabels] = useState<Record<string, MaterialLabel[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isReferenceLoading, setIsReferenceLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receivingGrnId, setReceivingGrnId] = useState<string | null>(null);
  const [cancellingGrnId, setCancellingGrnId] = useState<string | null>(null);
  const [printingGrnId, setPrintingGrnId] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const [activeLabelContainer, setActiveLabelContainer] = useState<GrnContainer | null>(null);
  const [isDetailHighlighted, setIsDetailHighlighted] = useState(false);
  const [cancelDraft, setCancelDraft] = useState<CancelDraft | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [containerPage, setContainerPage] = useState(0);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("ALL");
  const [queueSearch, setQueueSearch] = useState("");
  const detailSectionRef = useRef<HTMLElement | null>(null);
  const [createDocumentDraft, setCreateDocumentDraft] = useState<DocumentDraft>({
    documentName: "",
    documentType: "",
    documentUrl: "",
    file: null
  });

  const loadGrns = useCallback(async (pageNumber: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchGrns(pageNumber, PAGE_SIZE);
      setPage(result);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Unknown error while loading GRNs";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGrns(currentPage);
  }, [currentPage, loadGrns]);

  useEffect(() => {
    let cancelled = false;

    async function loadReferences() {
      setIsReferenceLoading(true);
      setFormError(null);

      try {
        const [supplierData, vendorData, vbuData, materialData, batchData, palletData] =
          await Promise.all([
            fetchSuppliers(),
            fetchVendors(),
            fetchVendorBusinessUnits(),
            fetchMaterials(),
            fetchBatches(),
            fetchPallets()
          ]);

        if (!cancelled) {
          setSuppliers(supplierData);
          setVendors(vendorData.content);
          setVendorBusinessUnits(vbuData.content);
          setMaterials(materialData.content);
          setBatches(batchData.content);
          setPallets(palletData.content);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : "Unknown error while loading reference data";
          setFormError(message);
        }
      } finally {
        if (!cancelled) {
          setIsReferenceLoading(false);
        }
      }
    }

    void loadReferences();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredVendorBusinessUnits = vendorBusinessUnits.filter(
    (unit) => !form.vendorId || unit.vendorId === form.vendorId
  );
  const supplierById = useMemo(() => new Map(suppliers.map((supplier) => [supplier.id, supplier])), [suppliers]);
  const vendorById = useMemo(() => new Map(vendors.map((vendor) => [vendor.id, vendor])), [vendors]);
  const vendorBusinessUnitById = useMemo(
    () => new Map(vendorBusinessUnits.map((unit) => [unit.id, unit])),
    [vendorBusinessUnits]
  );
  const materialById = useMemo(() => new Map(materials.map((material) => [material.id, material])), [materials]);
  const batchById = useMemo(() => new Map(batches.map((batch) => [batch.id, batch])), [batches]);
  const palletById = useMemo(() => new Map(pallets.map((pallet) => [pallet.id, pallet])), [pallets]);
  const queueItems = useMemo(() => {
    const entries = page?.content ?? [];
    const search = queueSearch.trim().toLowerCase();

    return entries.filter((grn) => {
      const matchesFilter = queueFilter === "ALL" || grn.status === queueFilter;
      const supplierName = supplierById.get(grn.supplierId)?.supplierName?.toLowerCase() ?? "";
      const matchesSearch =
        search.length === 0 ||
        grn.grnNumber.toLowerCase().includes(search) ||
        (grn.invoiceNumber ?? "").toLowerCase().includes(search) ||
        supplierName.includes(search) ||
        grn.items.some((item) => {
          const material = materialById.get(item.materialId);
          return material
            ? `${material.materialCode} ${material.materialName}`.toLowerCase().includes(search)
            : false;
        });
      return matchesFilter && matchesSearch;
    });
  }, [materialById, page?.content, queueFilter, queueSearch, supplierById]);

  const queueCounts = useMemo(() => {
    const counts: Record<QueueFilter, number> = {
      ALL: page?.content.length ?? 0,
      DRAFT: 0,
      RECEIVED: 0,
      CANCELLED: 0
    };

    for (const grn of page?.content ?? []) {
      counts[grn.status] += 1;
    }

    return counts;
  }, [page?.content]);

  async function handleSelectGrn(grnId: string, options?: { focusDetail?: boolean }) {
    setIsDetailLoading(true);
    setError(null);
    setIsQueueVisible(false);

    try {
      const grn = await fetchGrnById(grnId);
      setSelectedGrn(grn);

      const containerPairs = await Promise.all(
        grn.items.map(async (item) => [item.id, await fetchGrnItemContainers(item.id)] as const)
      );
      const nextItemContainers = Object.fromEntries(containerPairs);
      setItemContainers(nextItemContainers);

      const allContainers = containerPairs.flatMap(([, containers]) => containers);
      const labelPairs = await Promise.all(
        allContainers.map(async (container) => [container.id, await fetchContainerLabels(container.id)] as const)
      );
      setContainerLabels(Object.fromEntries(labelPairs));

      if (options?.focusDetail) {
        setIsDetailHighlighted(true);
        window.requestAnimationFrame(() => {
          detailSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        window.setTimeout(() => setIsDetailHighlighted(false), 2200);
      }
    } catch (detailError) {
      const message =
        detailError instanceof Error ? detailError.message : "Unknown error while loading GRN detail";
      setError(message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  useEffect(() => {
    setContainerPage(0);
  }, [selectedGrn?.id]);

  useEffect(() => {
    if (isCreateMode || queueSearch.trim().length === 0 || queueItems.length !== 1) {
      return;
    }

    const onlyMatch = queueItems[0];
    if (selectedGrn?.id === onlyMatch.id) {
      return;
    }

    void handleSelectGrn(onlyMatch.id);
  }, [handleSelectGrn, isCreateMode, queueItems, queueSearch, selectedGrn?.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);

    const invalidContainerQuantityIndex = form.items.findIndex(
      (item) => item.quantityPerContainer * item.numberOfContainers !== item.receivedQuantity
    );
    if (invalidContainerQuantityIndex >= 0) {
      setFormError(
        `Line item ${invalidContainerQuantityIndex + 1}: quantity per container multiplied by number of containers must equal received quantity.`
      );
      setIsSubmitting(false);
      return;
    }

    const invalidAcceptedRejectedIndex = form.items.findIndex(
      (item) => item.acceptedQuantity + item.rejectedQuantity > item.receivedQuantity
    );
    if (invalidAcceptedRejectedIndex >= 0) {
      setFormError(
        `Line item ${invalidAcceptedRejectedIndex + 1}: accepted and rejected quantities cannot exceed received quantity.`
      );
      setIsSubmitting(false);
      return;
    }

    if (
      createDocumentDraft.file &&
      (!createDocumentDraft.documentName.trim() || !createDocumentDraft.documentType.trim())
    ) {
      setFormError("Document name and document type are required when uploading a GRN line item document.");
      setIsSubmitting(false);
      return;
    }

    try {
      const createdGrn = await createGrn({
        ...form,
        grnNumber: form.grnNumber.trim(),
        invoiceNumber: form.invoiceNumber?.trim() || undefined,
        remarks: form.remarks?.trim() || undefined,
        createdBy: form.createdBy.trim(),
        items: form.items.map((item) => ({
          ...item,
          vendorBatch: item.vendorBatch.trim(),
          description: item.description?.trim() || undefined,
          manufactureDate: item.manufactureDate || undefined,
          expiryDate: item.expiryDate || undefined,
          retestDate: item.retestDate || undefined
        }))
      });

      if (createDocumentDraft.file && createdGrn.items[0]) {
        await uploadGrnDocument(createdGrn.items[0].id, {
          documentName: createDocumentDraft.documentName.trim(),
          documentType: createDocumentDraft.documentType.trim(),
          documentUrl: createDocumentDraft.documentUrl.trim() || undefined,
          createdBy: form.createdBy.trim(),
          file: createDocumentDraft.file
        });
      }

      const refreshedGrn = await fetchGrnById(createdGrn.id);

      setPage((current) =>
        current
          ? { ...current, content: [refreshedGrn, ...current.content], totalElements: current.totalElements + 1 }
          : null
      );
      setForm(createInitialForm(currentUserName));
      setCreateDocumentDraft({
        documentName: "",
        documentType: "",
        documentUrl: "",
        file: null
      });
      setSuccessMessage(
        createDocumentDraft.file
          ? `GRN ${refreshedGrn.grnNumber} created successfully with line item document.`
          : `GRN ${refreshedGrn.grnNumber} created successfully.`
      );
      setQueueMessage(null);
      setSelectedGrn(refreshedGrn);
      setIsCreateMode(false);
      setIsQueueVisible(false);
      setItemContainers({});
      setContainerLabels({});
      await loadGrns(currentPage);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unknown error while creating GRN";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReceive(grnId: string) {
    setReceivingGrnId(grnId);
    setError(null);
    setQueueMessage(null);

    try {
      const updatedGrn = await receiveGrn(grnId, form.createdBy.trim() || currentUserName);
      const refreshedBatchPage = await fetchBatches();
      setBatches(refreshedBatchPage.content);
      await loadGrns(currentPage);
      if (selectedGrn?.id === grnId) {
        void handleSelectGrn(grnId);
      }
      setQueueMessage(`GRN ${updatedGrn.grnNumber} received successfully.`);
    } catch (receiveError) {
      const message =
        receiveError instanceof Error ? receiveError.message : "Unknown error while receiving GRN";
      setError(message);
    } finally {
      setReceivingGrnId(null);
    }
  }

  async function handlePrintLabels(grnId: string) {
    setPrintingGrnId(grnId);
    setError(null);

    try {
      const printData = await fetchGrnLabelPrintData(grnId);
      if (printData.entries.length === 0) {
        setError("No labels are available for printing on this GRN yet.");
        return;
      }

      const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
      if (!printWindow) {
        setError("Unable to open the print window. Please allow pop-ups and try again.");
        return;
      }

      printWindow.document.open();
      printWindow.document.write(buildLabelPrintHtml(printData));
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (printError) {
      const message =
        printError instanceof Error ? printError.message : "Unknown error while preparing GRN labels";
      setError(message);
    } finally {
      setPrintingGrnId(null);
    }
  }

  async function handleConfirmCancel() {
    if (!cancelDraft) {
      return;
    }

    setCancellingGrnId(cancelDraft.grnId);
    setError(null);
    setQueueMessage(null);

    try {
      const updatedGrn = await cancelGrn(
        cancelDraft.grnId,
        form.createdBy.trim() || currentUserName,
        cancelReason.trim() || undefined
      );
      await loadGrns(currentPage);
      if (selectedGrn?.id === cancelDraft.grnId) {
        await handleSelectGrn(cancelDraft.grnId);
      }
      setQueueMessage(`GRN ${updatedGrn.grnNumber} cancelled successfully.`);
      setCancelDraft(null);
      setCancelReason("");
    } catch (cancelError) {
      const message =
        cancelError instanceof Error ? cancelError.message : "Unknown error while cancelling GRN";
      setError(message);
    } finally {
      setCancellingGrnId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-blue-100 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400">
              {isCreateMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsCreateMode(false)}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    GRN / Inbound
                  </button>
                  <span className="mx-1">/</span>
                  <span className="font-medium text-slate-700">Create New GRN</span>
                </>
              ) : (
                <>
                  Operations / <span className="font-medium text-blue-700">GRN / Inbound</span>
                </>
              )}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-800">
              {isCreateMode ? "Create New GRN" : "GRN Inbound"}
            </h1>
          </div>
          {isCreateMode ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateMode(false)}
                className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="grn-create-form"
                disabled={isSubmitting || isReferenceLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {isSubmitting ? "Submitting..." : "Submit GRN →"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreateMode(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + New GRN
            </button>
          )}
        </div>
      </section>

      {!isCreateMode && queueCounts.DRAFT > 0 ? (
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-sm text-amber-800">
            <strong>{queueCounts.DRAFT} draft GRNs</strong> are waiting to be received or cancelled.
          </span>
        </section>
      ) : null}

      {queueMessage ? (
        <section className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {queueMessage}
        </section>
      ) : null}

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      {!isCreateMode ? (
      <section className="grid gap-4 xl:grid-cols-4">
        {[
          ["All GRNs", queueCounts.ALL, "border-l-blue-500"],
          ["Draft", queueCounts.DRAFT, "border-l-amber-400"],
          ["Received", queueCounts.RECEIVED, "border-l-green-500"],
          ["Cancelled", queueCounts.CANCELLED, "border-l-red-400"]
        ].map(([label, value, tone]) => (
          <article key={label} className={`rounded-2xl border border-blue-100 border-l-4 bg-white p-4 shadow-sm ${tone}`}>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">{isLoading ? "--" : value}</p>
          </article>
        ))}
      </section>
      ) : null}

      {!isCreateMode ? (
      <section>
        {isQueueVisible ? (
        <aside className="overflow-hidden rounded-[24px] border border-blue-100 bg-white shadow-sm">
          <div className="border-b border-blue-100 px-4 py-4">
            <p className="text-sm font-semibold text-slate-700">GRN queue</p>
            <input
              value={queueSearch}
              onChange={(event) => setQueueSearch(event.target.value)}
              placeholder="Search GRN, material, supplier..."
              className="mt-3 w-full rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-300"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {(["ALL", "DRAFT", "RECEIVED", "CANCELLED"] as QueueFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setQueueFilter(filter)}
                  className={[
                    "rounded-full px-3 py-1 text-[11px] font-semibold transition",
                    queueFilter === filter
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-slate-500 hover:bg-blue-100"
                  ].join(" ")}
                >
                  {filter === "ALL"
                    ? `All`
                    : filter === "DRAFT"
                      ? "Pending QC"
                      : filter === "RECEIVED"
                        ? "Released"
                        : "Rejected"}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[780px] overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-6 text-sm text-slate-500">Loading GRNs...</p>
            ) : queueItems.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">No GRNs match the current filter.</p>
            ) : (
              queueItems.map((grn) => (
                <button
                  key={grn.id}
                  type="button"
                  onClick={() => void handleSelectGrn(grn.id, { focusDetail: true })}
                  className={[
                    "w-full border-b border-slate-100 px-4 py-4 text-left transition",
                    selectedGrn?.id === grn.id ? "border-l-[3px] border-l-blue-600 bg-blue-50" : "hover:bg-slate-50"
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-xs font-bold text-blue-700">{grn.grnNumber}</span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusPill(grn.status)}`}>
                      {grn.status === "DRAFT" ? "QC Pending" : grn.status === "RECEIVED" ? "Released" : "Rejected"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-800">
                    {grn.items[0] ? materialById.get(grn.items[0].materialId)?.materialName ?? summarizeMaterials(grn) : summarizeMaterials(grn)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {(supplierById.get(grn.supplierId)?.supplierName ?? "Supplier")} · {formatDisplayDate(grn.receiptDate)}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {sumQuantity(grn, "receivedQuantity")} · {grn.items.reduce((total, item) => total + item.numberOfContainers, 0)} containers
                  </p>
                </button>
              ))
            )}
          </div>

          {page ? (
            <div className="flex items-center justify-between gap-3 border-t border-blue-100 px-4 py-3 text-xs text-slate-500">
              <span>
                Page {page.number + 1} of {Math.max(page.totalPages, 1)}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((current) => Math.max(0, current - 1))}
                  disabled={page.first}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((current) => current + 1)}
                  disabled={page.last}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </aside>
        ) : (
        <section
          ref={detailSectionRef}
          className={`rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm transition-all duration-300 ${
            isDetailHighlighted ? "ring-2 ring-blue-300" : ""
          }`}
        >
          {selectedGrn ? (
            <>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <button
                    type="button"
                    onClick={() => setIsQueueVisible(true)}
                    className="mb-3 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                  >
                    ← Back to GRNs
                  </button>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-mono text-2xl font-bold text-slate-800">{selectedGrn.grnNumber}</h2>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusPill(selectedGrn.status)}`}>
                      {selectedGrn.status === "DRAFT" ? "QC Pending" : selectedGrn.status === "RECEIVED" ? "Released" : "Rejected"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Received {formatDisplayDateTime(selectedGrn.receiptDate)} · Created by {selectedGrn.createdBy}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-green-50 px-3 py-1 text-[11px] font-semibold text-green-700">
                      Accepted: {sumQuantity(selectedGrn, "acceptedQuantity")}
                    </span>
                    <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-700">
                      Rejected: {formatQuantity(selectedGrn.items.reduce((sum, item) => sum + (item.rejectedQuantity ?? 0), 0), selectedGrn.items[0]?.uom ?? "")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedGrn.status === "RECEIVED" ? (
                    <button
                      type="button"
                      onClick={() => void handlePrintLabels(selectedGrn.id)}
                      disabled={printingGrnId === selectedGrn.id}
                      className="rounded-xl border border-blue-200 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      {printingGrnId === selectedGrn.id ? "Preparing..." : "Print Labels"}
                    </button>
                  ) : null}
                  {selectedGrn.status === "RECEIVED" ? (
                    <button
                      type="button"
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm"
                    >
                      Send to QC →
                    </button>
                  ) : null}
                  {selectedGrn.status === "DRAFT" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleReceive(selectedGrn.id)}
                        disabled={receivingGrnId === selectedGrn.id}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                      >
                        {receivingGrnId === selectedGrn.id ? "Receiving..." : "Receive"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCancelDraft({ grnId: selectedGrn.id, grnNumber: selectedGrn.grnNumber });
                          setCancelReason("");
                        }}
                        className="rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-white px-4 py-4">
              <div className="flex items-center gap-3 overflow-x-auto">
                {[
                  { label: "GRN Created", done: true },
                  { label: "Items Received", done: selectedGrn.status !== "DRAFT" },
                  { label: "QC Sampling", done: selectedGrn.status === "RECEIVED" },
                  { label: "QC Decision", done: selectedGrn.status === "RECEIVED" },
                  { label: "Released", done: false }
                ].map((step, index) => (
                  <div key={step.label} className="flex min-w-max items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${step.done ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                      {index + 1}
                    </div>
                    <span className={`text-xs font-semibold ${step.done ? "text-blue-700" : "text-slate-400"}`}>{step.label}</span>
                    {index < 4 ? <div className={`h-0.5 w-8 ${step.done ? "bg-blue-300" : "bg-slate-200"}`} /> : null}
                  </div>
                ))}
              </div>
              </div>

              {isDetailLoading ? (
                <p className="mt-6 text-sm text-slate-500">Loading GRN detail...</p>
              ) : (
                <div className="mt-6 space-y-5">
                  {selectedGrn.items[0] ? (() => {
                    const allDocs = selectedGrn.items.flatMap((item) => item.documents);
                    const allContainers = selectedGrn.items.flatMap((item) => itemContainers[item.id] ?? []);
                    const CONTAINERS_PER_PAGE = 5;
                    const totalContainerPages = Math.ceil(allContainers.length / CONTAINERS_PER_PAGE);
                    const pagedContainers = allContainers.slice(
                      containerPage * CONTAINERS_PER_PAGE,
                      (containerPage + 1) * CONTAINERS_PER_PAGE
                    );

                    return (
                      <div className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
                        {/* Left column: Supplier & Material + Attached Documents */}
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                              <div className="h-4 w-1 rounded bg-blue-500" />
                              Supplier & Material
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                              {[
                                { label: "Supplier", value: supplierById.get(selectedGrn.supplierId)?.supplierName ?? "Not linked", mono: false },
                                { label: "Vendor", value: vendorById.get(selectedGrn.vendorId)?.vendorName ?? "Not linked", mono: false },
                                { label: "Invoice No.", value: selectedGrn.invoiceNumber || "Pending", mono: true },
                                { label: "Vendor BU", value: vendorBusinessUnitById.get(selectedGrn.vendorBusinessUnitId)?.unitName ?? "Not linked", mono: false },
                                { label: "Material", value: materialById.get(selectedGrn.items[0].materialId)?.materialName ?? "Pending", mono: false },
                                { label: "Material Code", value: materialById.get(selectedGrn.items[0].materialId)?.materialCode ?? "Pending", mono: true, accent: true },
                                { label: "Supplier Batch", value: selectedGrn.items[0].vendorBatch || "Pending", mono: true },
                                { label: "Receipt Time", value: formatDisplayDateTime(selectedGrn.receiptDate), mono: false },
                                { label: "Expiry Date", value: formatDisplayDate(selectedGrn.items[0].expiryDate), mono: false },
                                { label: "MFG Date", value: formatDisplayDate(selectedGrn.items[0].manufactureDate), mono: false },
                                { label: "Total Received", value: sumQuantity(selectedGrn, "receivedQuantity"), mono: false, bold: true },
                                { label: "Total Accepted", value: sumQuantity(selectedGrn, "acceptedQuantity"), mono: false, bold: true },
                                { label: "Remarks", value: selectedGrn.remarks || "No remarks", mono: false },
                                {
                                  label: "Audit Trail",
                                  value: selectedGrn.updatedBy
                                    ? `Created by ${selectedGrn.createdBy} · Last updated by ${selectedGrn.updatedBy}`
                                    : `Created by ${selectedGrn.createdBy}`,
                                  mono: false
                                },
                              ].map(({ label, value, mono, accent, bold }) => (
                                <div key={label}>
                                  <div className="text-[10px] font-semibold uppercase text-slate-400">{label}</div>
                                  <div className={`mt-0.5 text-[13px] leading-5 ${mono ? "font-mono" : ""} ${accent ? "text-blue-600" : bold ? "font-bold text-blue-700" : "font-semibold text-slate-800"}`}>
                                    {value}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Attached Documents – only shown when docs exist */}
                          {allDocs.length > 0 ? (
                            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                                <div className="h-4 w-1 rounded bg-violet-500" />
                                Attached Documents
                              </div>
                              <div className="space-y-2">
                                {allDocs.map((doc) => (
                                  <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100 text-[10px] font-bold text-red-500">
                                      PDF
                                    </div>
                                    <span className="flex-1 truncate text-xs font-medium text-slate-700">{doc.documentName}</span>
                                    <span className="shrink-0 text-[10px] text-slate-400">{doc.documentType}</span>
                                    {doc.documentUrl ? (
                                      <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer"
                                        className="shrink-0 text-[10px] font-semibold text-blue-600 hover:underline">
                                        View
                                      </a>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {/* Right column: Containers with pagination */}
                        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                          <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                              <div className="h-4 w-1 rounded bg-indigo-500" />
                              Containers ({allContainers.length})
                            </div>
                          </div>

                          {allContainers.length === 0 ? (
                            <p className="py-4 text-sm text-slate-500">No containers generated yet.</p>
                          ) : (
                            <>
                              <div className="overflow-hidden rounded-xl border border-blue-100">
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-blue-100 text-left">
                                    <thead className="bg-blue-50/70">
                                      <tr className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                        <th className="px-3 py-3">Container</th>
                                        <th className="px-3 py-3">Type</th>
                                        <th className="px-3 py-3">Quantity</th>
                                        <th className="px-3 py-3">Label</th>
                                        <th className="px-3 py-3">Pallet</th>
                                        <th className="px-3 py-3">Status</th>
                                        <th className="px-3 py-3 text-right">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-blue-50 bg-white">
                                      {pagedContainers.map((container) => {
                                        const statusLabel = container.sampled ? "Sampling" : container.labelStatus;
                                        const statusCls = container.sampled
                                          ? "bg-amber-100 text-amber-700"
                                          : container.labelStatus === "APPLIED"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-slate-100 text-slate-600";
                                        return (
                                          <tr key={container.id} className="text-xs text-slate-700">
                                            <td className="px-3 py-3 font-semibold text-slate-800">
                                              {container.containerNumber}
                                            </td>
                                            <td className="px-3 py-3">
                                              <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-700">
                                                {container.containerType}
                                              </span>
                                            </td>
                                            <td className="px-3 py-3">
                                              {container.quantity} {container.uom}
                                            </td>
                                            <td className="px-3 py-3 font-mono text-[11px] text-blue-600">
                                              {container.internalLot}
                                            </td>
                                            <td className="px-3 py-3 text-[11px] text-slate-500">
                                              {palletById.get(container.palletId)?.palletCode ?? "Pending"}
                                            </td>
                                            <td className="px-3 py-3">
                                              <span
                                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusCls}`}
                                              >
                                                <span
                                                  className={`h-1.5 w-1.5 rounded-full ${
                                                    container.sampled
                                                      ? "bg-amber-500"
                                                      : container.labelStatus === "APPLIED"
                                                        ? "bg-green-500"
                                                        : "bg-slate-400"
                                                  }`}
                                                />
                                                {statusLabel}
                                              </span>
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                              <button
                                                type="button"
                                                onClick={() => setActiveLabelContainer(container)}
                                                className="text-[11px] font-semibold text-blue-600 hover:underline"
                                              >
                                                Label Details
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {totalContainerPages > 1 ? (
                                <div className="mt-3 flex items-center justify-between border-t border-blue-50 pt-3">
                                  <span className="text-[11px] text-slate-400">
                                    {containerPage * CONTAINERS_PER_PAGE + 1}–{Math.min((containerPage + 1) * CONTAINERS_PER_PAGE, allContainers.length)} of {allContainers.length}
                                  </span>
                                  <div className="flex gap-1.5">
                                    <button
                                      type="button"
                                      disabled={containerPage === 0}
                                      onClick={() => setContainerPage((p) => p - 1)}
                                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
                                    >
                                      ← Prev
                                    </button>
                                    <button
                                      type="button"
                                      disabled={containerPage >= totalContainerPages - 1}
                                      onClick={() => setContainerPage((p) => p + 1)}
                                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
                                    >
                                      Next →
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })() : null}

                  {/* Line items – clean mini-card per line */}
                  {selectedGrn.items.map((item) => {
                    const material = materialById.get(item.materialId);
                    const batch = item.batchId ? batchById.get(item.batchId) : null;
                    const pallet = item.palletId ? palletById.get(item.palletId) : null;

                    return (
                      <article key={item.id} className="rounded-2xl border border-blue-100 bg-slate-50/60 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Line {item.lineNumber}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {material ? `${material.materialCode} – ${material.materialName}` : item.materialId}
                            </p>
                          </div>
                          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold ${
                            item.qcStatus === "APPROVED" ? "bg-green-100 text-green-700"
                            : item.qcStatus === "REJECTED" ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                          }`}>
                            {item.qcStatus}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                          {[
                            { label: "Batch", value: batch?.batchNumber ?? item.batchId ?? "Pending", mono: true },
                            { label: "Pallet", value: pallet?.palletCode ?? item.palletId ?? "Pending", mono: true },
                            { label: "Received", value: `${item.receivedQuantity} ${item.uom}` },
                            { label: "Accepted", value: `${item.acceptedQuantity} ${item.uom}`, accent: "green" },
                            { label: "Containers", value: String(item.numberOfContainers) },
                          ].map(({ label, value, mono, accent }) => (
                            <div key={label} className="rounded-xl border border-blue-100 bg-white px-3 py-2.5">
                              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
                              <div className={`mt-1 text-xs font-semibold ${mono ? "font-mono" : ""} ${accent === "green" ? "text-green-700" : "text-slate-800"}`}>
                                {value}
                              </div>
                            </div>
                          ))}
                        </div>
                        {item.documents.length > 0 ? (
                          <div className="mt-3 space-y-1.5">
                            {item.documents.map((doc) => (
                              <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white px-3 py-2">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-red-100 text-[9px] font-bold text-red-500">PDF</div>
                                <span className="flex-1 truncate text-xs text-slate-700">{doc.documentName}</span>
                                <span className="text-[10px] text-slate-400">{doc.documentType}</span>
                                {doc.documentUrl ? (
                                  <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer"
                                    className="text-[10px] font-semibold text-blue-600 hover:underline">View</a>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}

                  <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      <div className="h-4 w-1 rounded bg-slate-400" />
                      Audit Trail
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500 ring-4 ring-blue-50" />
                        <div>
                          <p className="text-xs font-semibold text-slate-700">GRN Created</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            by {selectedGrn.createdBy} · {formatDisplayDate(selectedGrn.createdAt)}
                          </p>
                        </div>
                      </div>
                      {selectedGrn.updatedBy ? (
                        <div className="flex items-start gap-3">
                          <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-500 ring-4 ring-indigo-50" />
                          <div>
                            <p className="text-xs font-semibold text-slate-700">
                              {selectedGrn.status === "RECEIVED"
                                ? "Received / Released"
                                : selectedGrn.status === "CANCELLED"
                                  ? "Cancelled"
                                  : "Updated"}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              by {selectedGrn.updatedBy} · {formatDisplayDate(selectedGrn.updatedAt)}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-[22px] border border-dashed border-blue-200 bg-blue-50/40 px-6 text-center">
              <div>
                <p className="text-sm font-semibold text-slate-700">No GRN selected</p>
                <p className="mt-2 text-sm text-slate-500">
                  Return to the queue and select a GRN to view receipt data, line items, generated containers, and label history.
                </p>
                <button
                  type="button"
                  onClick={() => setIsQueueVisible(true)}
                  className="mt-4 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                >
                  Open GRN Queue
                </button>
              </div>
            </div>
          )}
        </section>
        )}
      </section>
      ) : (
      <section className="overflow-hidden rounded-[24px] border border-blue-100 bg-white shadow-sm">
        <form id="grn-create-form" onSubmit={handleSubmit}>
          <div className="grid xl:grid-cols-[220px_minmax(0,1fr)]">

            {/* Step sidebar */}
            <div className="border-r border-blue-100 bg-blue-50/70 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Progress</p>
              <div className="mt-4 space-y-2">
                {[
                  ["1", "Header Info", "Supplier & invoice"],
                  ["2", "Material Details", "Material & batch"],
                  ["3", "Containers", "Qty & container types"],
                  ["4", "Documents", "CoA and attachments"],
                  ["5", "Review & Submit", "Finalize GRN"]
                ].map(([step, title, note], index) => (
                  <div key={step} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${index === 0 ? "border border-blue-200 bg-white" : ""}`}>
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-blue-600 text-white shadow-sm" : "bg-slate-200 text-slate-500"}`}>
                      {step}
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${index === 0 ? "text-blue-700" : "text-slate-500"}`}>{title}</div>
                      <div className="text-[10px] text-slate-400">{note}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl border border-blue-100 bg-white p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Auto-assigned</div>
                <div className="mt-2 text-[10px] text-slate-500">GRN number</div>
                <div className="font-mono text-xs font-semibold text-blue-700">{form.grnNumber || "Will be assigned"}</div>
                <div className="mt-2 text-[10px] text-slate-500">Created by</div>
                <div className="text-xs font-semibold text-slate-700">{currentUserName}</div>
                <div className="mt-2 text-[10px] text-slate-500">Receipt date</div>
                <div className="text-xs font-semibold text-slate-700">{formatDisplayDate(form.receiptDate)}</div>
              </div>
            </div>

            {/* Scrollable form area */}
            <div className="max-h-[calc(100vh-180px)] overflow-y-auto bg-[#f7faff] p-6">
              <div className="mx-auto max-w-3xl space-y-5">

                {/* ── Section 1: Header Info ── */}
                <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm">1</div>
                    <div>
                      <div className="font-semibold text-slate-700">Header Information</div>
                      <div className="text-xs text-slate-400">Supplier details and purchase order reference</div>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">GRN Number <span className="text-red-400">*</span></span>
                      <input required value={form.grnNumber} onChange={(e) => setForm((c) => ({ ...c, grnNumber: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
                        placeholder="GRN-2026-0001" />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Receipt Date &amp; Time <span className="text-red-400">*</span></span>
                      <input required type="date" value={form.receiptDate} onChange={(e) => setForm((c) => ({ ...c, receiptDate: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white" />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Supplier <span className="text-red-400">*</span></span>
                      <select required value={form.supplierId} onChange={(e) => setForm((c) => ({ ...c, supplierId: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white">
                        <option value="">Select supplier…</option>
                        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplierCode} – {s.supplierName}</option>)}
                      </select>
                      <p className="mt-1 text-[10px] text-slate-400">Commercial supplier / invoicing party</p>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Vendor (Corporate) <span className="text-red-400">*</span></span>
                      <select required value={form.vendorId}
                        onChange={(e) => setForm((c) => ({ ...c, vendorId: e.target.value, vendorBusinessUnitId: "" }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white">
                        <option value="">Select vendor…</option>
                        {vendors.map((v) => <option key={v.id} value={v.id}>{v.vendorCode} – {v.vendorName}</option>)}
                      </select>
                      <p className="mt-1 text-[10px] text-slate-400">Corporate legal entity</p>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Manufacturing Site / VBU</span>
                      <select value={form.vendorBusinessUnitId} onChange={(e) => setForm((c) => ({ ...c, vendorBusinessUnitId: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white">
                        <option value="">No site selected</option>
                        {filteredVendorBusinessUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.buCode ? `${u.buCode} – ` : ""}{u.unitName}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[10px] text-slate-400">Optional for now. Select the actual supplying site when you want site-level qualification and audit tracking.</p>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Supplier Invoice No.</span>
                      <input value={form.invoiceNumber} onChange={(e) => setForm((c) => ({ ...c, invoiceNumber: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
                        placeholder="INV-SA-20260417" />
                    </label>
                  </div>
                  <label className="mt-4 block">
                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Remarks</span>
                    <textarea value={form.remarks} onChange={(e) => setForm((c) => ({ ...c, remarks: e.target.value }))}
                      className="min-h-[72px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
                      placeholder="Initial inward receipt" />
                  </label>
                </div>

                {/* ── Section 2: Material Details (line items) ── */}
                <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm">2</div>
                      <div>
                        <div className="font-semibold text-slate-700">Material Details</div>
                        <div className="text-xs text-slate-400">What material was received — one card per line item</div>
                      </div>
                    </div>
                    <button type="button"
                      onClick={() => setForm((c) => ({ ...c, items: [...c.items, createEmptyGrnItem()] }))}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-4">
                    {form.items.map((item, index) => {
                      const selectedMaterial = materials.find((m) => m.id === item.materialId);
                      const filteredPallets = pallets.filter((p) => !selectedMaterial || p.storageCondition === selectedMaterial.storageCondition);
                      const fld = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white";
                      const lbl = "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500";

                      return (
                        <div key={`line-item-${index}`} className="rounded-xl border border-blue-100 bg-slate-50/60 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Line Item {index + 1}</p>
                              {selectedMaterial && (
                                <p className="mt-0.5 text-xs font-semibold text-blue-700">{selectedMaterial.materialCode} – {selectedMaterial.materialName}</p>
                              )}
                            </div>
                            <button type="button" disabled={form.items.length === 1}
                              onClick={() => setForm((c) => ({ ...c, items: c.items.length === 1 ? c.items : c.items.filter((_, i) => i !== index) }))}
                              className="rounded-lg border border-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300">
                              Remove
                            </button>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <label className="col-span-full block sm:col-span-2 lg:col-span-2">
                              <span className={lbl}>Material <span className="text-red-400">*</span></span>
                              <select required value={item.materialId}
                                onChange={(e) => setForm((c) => ({ ...c, items: c.items.map((ci, i) => i === index ? { ...ci, materialId: e.target.value, uom: materials.find((m) => m.id === e.target.value)?.uom ?? ci.uom } : ci) }))}
                                className={fld}>
                                <option value="">Search material by code or name…</option>
                                {materials.map((m) => <option key={m.id} value={m.id}>{m.materialCode} – {m.materialName}</option>)}
                              </select>
                            </label>
                            <label className="block">
                              <span className={lbl}>Material Type</span>
                              <input readOnly value={selectedMaterial?.materialType ?? "–"} className="w-full rounded-xl border border-slate-100 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 outline-none" />
                            </label>
                            <label className="block">
                              <span className={lbl}>Supplier Batch No. <span className="text-red-400">*</span></span>
                              <input required value={item.vendorBatch} placeholder="As on CoA"
                                onChange={(e) => setForm((c) => ({ ...c, items: c.items.map((ci, i) => i === index ? { ...ci, vendorBatch: e.target.value } : ci) }))}
                                className={fld} />
                              <span className="mt-1 block text-[11px] text-slate-400">Enter the supplier or manufacturer batch shown on the CoA or packing label.</span>
                            </label>
                            <label className="block">
                              <span className={lbl}>System Batch No.</span>
                              <input readOnly value="Generated after GRN creation" className="w-full rounded-xl border border-slate-100 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 outline-none" />
                              <span className="mt-1 block text-[11px] text-slate-400">This internal batch number is created by the system only after the GRN is saved.</span>
                            </label>
                            <label className="block">
                              <span className={lbl}>Pallet <span className="text-red-400">*</span></span>
                              <select required value={item.palletId}
                                onChange={(e) => setForm((c) => ({ ...c, items: c.items.map((ci, i) => i === index ? { ...ci, palletId: e.target.value } : ci) }))}
                                className={fld}>
                                <option value="">Select pallet…</option>
                                {filteredPallets.map((p) => <option key={p.id} value={p.id}>{p.palletCode} – {p.palletName} ({p.storageCondition})</option>)}
                              </select>
                            </label>
                          </div>

                          {/* Qty row */}
                          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <label className="block">
                              <span className={lbl}>Received Qty <span className="text-red-400">*</span></span>
                              <div className="flex gap-1.5">
                                <input required type="number" min="0" step="0.001" value={item.receivedQuantity}
                                  onChange={(e) => setForm((c) => ({ ...c, items: c.items.map((ci, i) => i === index ? { ...ci, receivedQuantity: Number(e.target.value) } : ci) }))}
                                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white" />
                                <input required value={item.uom}
                                  onChange={(e) => setForm((c) => ({ ...c, items: c.items.map((ci, i) => i === index ? { ...ci, uom: e.target.value } : ci) }))}
                                  className="w-16 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white" />
                              </div>
                            </label>
                            <label className="block">
                              <span className={lbl}>Accepted Qty <span className="text-red-400">*</span></span>
                              <input required type="number" min="0" step="0.001" value={item.acceptedQuantity}
                                onChange={(e) => setForm((c) => ({ ...c, items: c.items.map((ci, i) => i === index ? { ...ci, acceptedQuantity: Number(e.target.value) } : ci) }))}
                                className={fld} />
                            </label>
                            <label className="block">
                              <span className={lbl}>Rejected Qty</span>
                              <input type="number" min="0" step="0.001" value={item.rejectedQuantity}
                                onChange={(e) => setForm((c) => ({ ...c, items: c.items.map((ci, i) => i === index ? { ...ci, rejectedQuantity: Number(e.target.value) } : ci) }))}
                                className={fld} />
                            </label>
                            <label className="block">
                              <span className={lbl}>Unit Price</span>
                              <input type="number" min="0" step="0.01" value={item.unitPrice}
                                onChange={(e) => setForm((c) => ({ ...c, items: c.items.map((ci, i) => i === index ? { ...ci, unitPrice: Number(e.target.value) } : ci) }))}
                                className={fld} />
                            </label>
                          </div>

                          {/* Dates row */}
                          <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            {(["manufactureDate", "expiryDate", "retestDate"] as const).map((field) => (
                              <label key={field} className="block">
                                <span className={lbl}>{field === "manufactureDate" ? "Mfg Date" : field === "expiryDate" ? "Expiry Date" : "Retest Date"}</span>
                                <input type="date" value={item[field] as string}
                                  onChange={(e) => setForm((c) => ({ ...c, items: c.items.map((ci, i) => i === index ? { ...ci, [field]: e.target.value } : ci) }))}
                                  className={fld} />
                              </label>
                            ))}
                          </div>

                          <label className="mt-3 block">
                            <span className={lbl}>Description</span>
                            <textarea value={item.description}
                              onChange={(e) => setForm((c) => ({ ...c, items: c.items.map((ci, i) => i === index ? { ...ci, description: e.target.value } : ci) }))}
                              className="min-h-[60px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white" />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Section 3: Container / Package Details ── */}
                <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm">3</div>
                    <div>
                      <div className="font-semibold text-slate-700">Container / Package Details</div>
                      <div className="text-xs text-slate-400">Record container type and quantity per line item</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {form.items.map((item, index) => {
                      const selectedMaterial = materials.find((m) => m.id === item.materialId);
                      const fld = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white";
                      const lbl = "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500";
                      return (
                        <div key={`container-${index}`} className="rounded-xl border border-blue-100 bg-slate-50/60 p-4">
                          <p className="mb-3 text-xs font-bold text-blue-600">
                            Line {index + 1}{selectedMaterial ? ` — ${selectedMaterial.materialName}` : ""}
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <label className="block">
                              <span className={lbl}>Container Type</span>
                              <select value={item.containerType}
                                onChange={(e) => setForm((c) => ({ ...c, items: c.items.map((ci, i) => i === index ? { ...ci, containerType: e.target.value as ContainerType } : ci) }))}
                                className={fld}>
                                {containerTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </label>
                            <label className="block">
                              <span className={lbl}>No. of Containers <span className="text-red-400">*</span></span>
                              <input required type="number" min="1" step="1" value={item.numberOfContainers}
                                onChange={(e) => setForm((c) => ({ ...c, items: c.items.map((ci, i) => i === index ? { ...ci, numberOfContainers: Number(e.target.value) } : ci) }))}
                                className={fld} />
                            </label>
                            <label className="block">
                              <span className={lbl}>Qty / Container <span className="text-red-400">*</span></span>
                              <input required type="number" min="0" step="0.001" value={item.quantityPerContainer}
                                onChange={(e) => setForm((c) => ({ ...c, items: c.items.map((ci, i) => i === index ? { ...ci, quantityPerContainer: Number(e.target.value) } : ci) }))}
                                className={fld} />
                            </label>
                            <label className="block">
                              <span className={lbl}>QC Status</span>
                              <select value={item.qcStatus}
                                onChange={(e) => setForm((c) => ({ ...c, items: c.items.map((ci, i) => i === index ? { ...ci, qcStatus: e.target.value as QcStatus } : ci) }))}
                                className={fld}>
                                {qcStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </label>
                          </div>
                          {item.numberOfContainers > 0 && item.quantityPerContainer > 0 ? (
                            <div className={`mt-3 flex items-center gap-6 rounded-xl px-4 py-2.5 text-sm font-semibold ${item.numberOfContainers * item.quantityPerContainer === item.receivedQuantity ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                              <span>{item.numberOfContainers} × {item.quantityPerContainer} {item.uom} = {item.numberOfContainers * item.quantityPerContainer} {item.uom}</span>
                              {item.numberOfContainers * item.quantityPerContainer !== item.receivedQuantity ? (
                                <span className="text-xs font-semibold text-amber-600">⚠ Received qty is {item.receivedQuantity} {item.uom}</span>
                              ) : <span className="text-xs">✓ Matches received qty</span>}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Section 4: Supporting Documents ── */}
                <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm">4</div>
                    <div>
                      <div className="font-semibold text-slate-700">Supporting Documents</div>
                      <div className="text-xs text-slate-400">Attach CoA, MSDS, invoice copy — required for QC release</div>
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-3 gap-3">
                    {[
                      { icon: "📋", label: "Certificate of Analysis", note: "Required", color: "blue" },
                      { icon: "☣️", label: "MSDS / SDS", note: "Required", color: "blue" },
                      { icon: "🧾", label: "Invoice Copy", note: "Optional", color: "slate" }
                    ].map(({ icon, label, note, color }) => (
                      <div key={label} className={`cursor-pointer rounded-xl border-2 border-dashed p-3 text-center transition-all ${color === "blue" ? "border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100" : "border-slate-200 bg-slate-50 hover:border-slate-400"}`}>
                        <div className="mb-1 text-2xl">{icon}</div>
                        <div className={`text-xs font-bold ${color === "blue" ? "text-blue-700" : "text-slate-600"}`}>{label}</div>
                        <div className={`mt-0.5 text-[10px] ${color === "blue" ? "text-blue-500" : "text-slate-400"}`}>{note}</div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-white p-4">
                    <p className="mb-3 text-xs font-semibold text-slate-600">Attach document to first line item</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input value={createDocumentDraft.documentName}
                        onChange={(e) => setCreateDocumentDraft((c) => ({ ...c, documentName: e.target.value }))}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
                        placeholder="Document name (e.g. CoA)" />
                      <input value={createDocumentDraft.documentType}
                        onChange={(e) => setCreateDocumentDraft((c) => ({ ...c, documentType: e.target.value }))}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
                        placeholder="Type (COA / MSDS / INVOICE)" />
                      <input value={createDocumentDraft.documentUrl}
                        onChange={(e) => setCreateDocumentDraft((c) => ({ ...c, documentUrl: e.target.value }))}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
                        placeholder="Optional URL / path" />
                      <input type="file"
                        onChange={(e) => setCreateDocumentDraft((c) => ({ ...c, file: e.target.files?.[0] ?? null }))}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none" />
                    </div>
                  </div>
                </div>

                {/* ── Section 5: Review & Submit ── */}
                <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm">5</div>
                    <div>
                      <div className="font-semibold text-slate-700">Review &amp; Submit</div>
                      <div className="text-xs text-slate-400">Confirm details and electronic sign-off</div>
                    </div>
                  </div>

                  <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div><span className="block text-[10px] font-bold uppercase text-slate-500">Supplier</span><span className="font-semibold text-slate-800">{suppliers.find((s) => s.id === form.supplierId)?.supplierName ?? "Not selected"}</span></div>
                      <div><span className="block text-[10px] font-bold uppercase text-slate-500">Line Items</span><span className="font-semibold text-slate-800">{form.items.length}</span></div>
                      <div><span className="block text-[10px] font-bold uppercase text-slate-500">GRN No.</span><span className="font-mono font-bold text-blue-700">{form.grnNumber || "Pending"}</span></div>
                      <div><span className="block text-[10px] font-bold uppercase text-slate-500">Total Containers</span><span className="font-semibold text-slate-800">{form.items.reduce((sum, item) => sum + item.numberOfContainers, 0)}</span></div>
                      <div><span className="block text-[10px] font-bold uppercase text-slate-500">Receipt Date</span><span className="font-semibold text-slate-800">{formatDisplayDate(form.receiptDate)}</span></div>
                      <div><span className="block text-[10px] font-bold uppercase text-slate-500">Document</span><span className={`font-semibold ${createDocumentDraft.file ? "text-green-700" : "text-amber-600"}`}>{createDocumentDraft.file ? createDocumentDraft.documentName || "1 attached" : "None attached"}</span></div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                      <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      Electronic Sign-Off
                    </div>
                    <div className="mb-3 grid grid-cols-3 gap-4 text-sm">
                      <div><span className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Signing as</span><span className="font-bold text-slate-800">{currentUserName}</span></div>
                      <div><span className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Role</span><span className="font-semibold text-slate-700">QC Manager</span></div>
                      <div><span className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">Receipt Date</span><span className="font-semibold text-slate-700">{formatDisplayDate(form.receiptDate)}</span></div>
                    </div>
                    <p className="mt-2 text-[10px] text-slate-400">This action will be recorded in the audit trail per 21 CFR Part 11 / EU GMP Annex 11 requirements.</p>
                  </div>
                </div>

                {successMessage ? (
                  <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{successMessage}</div>
                ) : null}
                {formError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
                ) : null}

              </div>
            </div>
          </div>
        </form>
      </section>
      )}

      {cancelDraft ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/30 px-4"
          onClick={() => {
            if (!cancellingGrnId) {
              setCancelDraft(null);
              setCancelReason("");
            }
          }}
        >
          <div
            className="w-full max-w-xl rounded-[28px] border border-ink/10 bg-white p-6 shadow-float"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-ink">Cancel GRN</h4>
                <p className="mt-1 text-sm text-slate">
                  Confirm cancellation for {cancelDraft.grnNumber}. Add a reason to preserve the decision context.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!cancellingGrnId) {
                    setCancelDraft(null);
                    setCancelReason("");
                  }
                }}
                className="rounded-full border border-ink/10 px-3 py-2 text-sm text-ink"
              >
                Close
              </button>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium text-ink">Reason</span>
              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                className="min-h-28 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                placeholder="Explain why this draft GRN is being cancelled."
              />
            </label>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setCancelDraft(null);
                  setCancelReason("");
                }}
                disabled={Boolean(cancellingGrnId)}
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:text-slate/40"
              >
                Keep Draft
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmCancel()}
                disabled={Boolean(cancellingGrnId)}
                className="rounded-2xl bg-redoxide px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-redoxide/50"
              >
                {cancellingGrnId === cancelDraft.grnId ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeLabelContainer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/30 px-4" onClick={() => setActiveLabelContainer(null)}>
          <div
            className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-ink/10 bg-white shadow-float"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
              <div>
                <h4 className="text-lg font-semibold text-ink">Sampling Label Details</h4>
                <p className="mt-1 text-sm text-slate">
                  {activeLabelContainer.containerNumber} / {activeLabelContainer.internalLot}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveLabelContainer(null)}
                className="rounded-full border border-ink/10 px-3 py-2 text-sm text-ink"
              >
                Close
              </button>
            </div>
            <div className="max-h-[62vh] overflow-auto p-6">
              {(containerLabels[activeLabelContainer.id] ?? []).length === 0 ? (
                <p className="text-sm text-slate">No labels found for this container.</p>
              ) : (
                <div className="space-y-4">
                  {(containerLabels[activeLabelContainer.id] ?? []).map((label) => (
                    <div key={label.id} className="rounded-2xl bg-mist/80 px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-ink">{label.labelType}</p>
                        <span className="status-pill bg-ink/5 text-ink">
                          {label.labelStatus}
                        </span>
                      </div>
                      {label.qrCodeDataUrl ? (
                        <div className="mt-3 inline-flex rounded-2xl bg-white p-3">
                          <img
                            src={label.qrCodeDataUrl}
                            alt={`${label.labelType} QR code`}
                            className="h-40 w-40"
                          />
                        </div>
                      ) : null}
                      <pre className="mt-3 whitespace-pre-wrap text-sm text-slate">
                        {label.labelContent}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
