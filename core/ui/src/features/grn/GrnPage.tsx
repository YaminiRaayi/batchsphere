import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import {
  createGrn,
  fetchBatches,
  fetchContainerLabels,
  fetchGrnById,
  fetchGrns,
  fetchGrnItemContainers,
  fetchMaterials,
  fetchPallets,
  fetchSuppliers,
  fetchVendorBusinessUnits,
  fetchVendors,
  getApiBaseUrl,
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
  Grn,
  GrnContainer,
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

function statusTone(status: Grn["status"]) {
  switch (status) {
    case "RECEIVED":
      return "bg-moss/15 text-moss";
    case "CANCELLED":
      return "bg-redoxide/15 text-redoxide";
    case "DRAFT":
    default:
      return "bg-amber/15 text-amber";
  }
}

const containerTypes: ContainerType[] = ["BAG", "DRUM", "BOX", "CAN", "BOTTLE", "FIBER_DRUM"];
const qcStatuses: QcStatus[] = ["PENDING", "APPROVED", "REJECTED", "PARTIALLY_APPROVED"];
const PAGE_SIZE = 15;

const initialForm: CreateGrnRequest = {
  grnNumber: "",
  supplierId: "",
  vendorId: "",
  vendorBusinessUnitId: "",
  receiptDate: new Date().toISOString().slice(0, 10),
  invoiceNumber: "",
  remarks: "",
  createdBy: "admin",
  items: [
    {
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
    }
  ]
};

export function GrnPage() {
  const [page, setPage] = useState<PageResponse<Grn> | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorBusinessUnits, setVendorBusinessUnits] = useState<VendorBusinessUnit[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [form, setForm] = useState<CreateGrnRequest>(initialForm);
  const [selectedGrn, setSelectedGrn] = useState<Grn | null>(null);
  const [itemContainers, setItemContainers] = useState<Record<string, GrnContainer[]>>({});
  const [containerLabels, setContainerLabels] = useState<Record<string, MaterialLabel[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isReferenceLoading, setIsReferenceLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receivingGrnId, setReceivingGrnId] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [activeLabelContainer, setActiveLabelContainer] = useState<GrnContainer | null>(null);
  const [isDetailHighlighted, setIsDetailHighlighted] = useState(false);
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
  const selectedMaterial = materials.find((material) => material.id === form.items[0].materialId);
  const filteredPallets = pallets.filter(
    (pallet) =>
      !selectedMaterial || pallet.storageCondition === selectedMaterial.storageCondition
  );

  async function handleSelectGrn(grnId: string, options?: { focusDetail?: boolean }) {
    setIsDetailLoading(true);
    setError(null);
    setIsDetailOpen(true);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);

    const item = form.items[0];
    if (item.quantityPerContainer * item.numberOfContainers !== item.receivedQuantity) {
      setFormError(
        "Quantity per container multiplied by number of containers must equal received quantity."
      );
      setIsSubmitting(false);
      return;
    }

    if (item.acceptedQuantity + item.rejectedQuantity > item.receivedQuantity) {
      setFormError("Accepted and rejected quantities cannot exceed received quantity.");
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
      setForm(initialForm);
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
      setIsDetailOpen(true);
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
      const updatedGrn = await receiveGrn(grnId, form.createdBy.trim() || "admin");
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

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Inbound"
        title="GRN operations should feel like a workflow--ToDO"
        description="You can update ."
      />

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="panel px-6 py-6">
          <div>
            <h4 className="text-lg font-semibold text-ink">Create GRN</h4>
            <p className="mt-1 text-sm text-slate">
              This first version creates a single-line-item GRN using the setup data already entered in master data.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">GRN number</span>
                <input
                  required
                  value={form.grnNumber}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, grnNumber: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  placeholder="GRN-001"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Receipt date</span>
                <input
                  required
                  type="date"
                  value={form.receiptDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, receiptDate: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Supplier</span>
                <select
                  required
                  value={form.supplierId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, supplierId: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.supplierCode} - {supplier.supplierName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Vendor</span>
                <select
                  required
                  value={form.vendorId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      vendorId: event.target.value,
                      vendorBusinessUnitId: ""
                    }))
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                >
                  <option value="">Select vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.vendorCode} - {vendor.vendorName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Vendor business unit</span>
                <select
                  required
                  value={form.vendorBusinessUnitId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, vendorBusinessUnitId: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                >
                  <option value="">Select business unit</option>
                  {filteredVendorBusinessUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unitName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Invoice number</span>
                <input
                  value={form.invoiceNumber}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, invoiceNumber: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  placeholder="INV-001"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Created by</span>
                <input
                  required
                  value={form.createdBy}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, createdBy: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Remarks</span>
              <textarea
                value={form.remarks}
                onChange={(event) =>
                  setForm((current) => ({ ...current, remarks: event.target.value }))
                }
                className="min-h-24 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                placeholder="Initial inward receipt"
              />
            </label>

            <div className="rounded-3xl border border-ink/10 bg-mist/80 p-5">
              <h5 className="text-base font-semibold text-ink">Line item</h5>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Material</span>
                  <select
                    required
                    value={form.items[0].materialId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        items: [
                          {
                            ...current.items[0],
                            materialId: event.target.value,
                            uom:
                              materials.find((material) => material.id === event.target.value)?.uom ??
                              current.items[0].uom
                          }
                        ]
                      }))
                    }
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  >
                    <option value="">Select material</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.materialCode} - {material.materialName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">In-house batch</span>
                  <input
                    readOnly
                    value="Auto-generated from GRN receipt"
                    className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm text-slate outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Pallet</span>
                  <select
                    required
                    value={form.items[0].palletId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        items: [{ ...current.items[0], palletId: event.target.value }]
                      }))
                    }
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  >
                    <option value="">Select pallet</option>
                    {filteredPallets.map((pallet) => (
                      <option key={pallet.id} value={pallet.id}>
                        {pallet.palletCode} - {pallet.palletName} ({pallet.storageCondition})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Material type</span>
                  <input
                    readOnly
                    value={selectedMaterial?.materialType ?? "Select material first"}
                    className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm text-ink outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Received qty</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.items[0].receivedQuantity}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        items: [
                          { ...current.items[0], receivedQuantity: Number(event.target.value) }
                        ]
                      }))
                    }
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Accepted qty</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.items[0].acceptedQuantity}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        items: [
                          { ...current.items[0], acceptedQuantity: Number(event.target.value) }
                        ]
                      }))
                    }
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Rejected qty</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.items[0].rejectedQuantity}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        items: [
                          { ...current.items[0], rejectedQuantity: Number(event.target.value) }
                        ]
                      }))
                    }
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">UOM</span>
                  <input
                    required
                    value={form.items[0].uom}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        items: [{ ...current.items[0], uom: event.target.value }]
                      }))
                    }
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Container type</span>
                  <select
                    value={form.items[0].containerType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        items: [
                          {
                            ...current.items[0],
                            containerType: event.target.value as ContainerType
                          }
                        ]
                      }))
                    }
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  >
                    {containerTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Containers</span>
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={form.items[0].numberOfContainers}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        items: [
                          { ...current.items[0], numberOfContainers: Number(event.target.value) }
                        ]
                      }))
                    }
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Qty per container</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.items[0].quantityPerContainer}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        items: [
                          { ...current.items[0], quantityPerContainer: Number(event.target.value) }
                        ]
                      }))
                    }
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Vendor batch</span>
                  <input
                    required
                    value={form.items[0].vendorBatch}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        items: [{ ...current.items[0], vendorBatch: event.target.value }]
                      }))
                    }
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Unit price</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.items[0].unitPrice}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        items: [{ ...current.items[0], unitPrice: Number(event.target.value) }]
                      }))
                    }
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">QC status</span>
                  <select
                    value={form.items[0].qcStatus}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        items: [{ ...current.items[0], qcStatus: event.target.value as QcStatus }]
                      }))
                    }
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  >
                    {qcStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {["manufactureDate", "expiryDate", "retestDate"].map((field) => (
                  <label key={field} className="block">
                    <span className="mb-2 block text-sm font-medium capitalize text-ink">
                      {field.replace(/([A-Z])/g, " $1")}
                    </span>
                    <input
                      type="date"
                      value={form.items[0][field as keyof (typeof form.items)[0]] as string}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          items: [{ ...current.items[0], [field]: event.target.value }]
                        }))
                      }
                      className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                    />
                  </label>
                ))}
              </div>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-medium text-ink">Description</span>
                <textarea
                  value={form.items[0].description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      items: [{ ...current.items[0], description: event.target.value }]
                    }))
                  }
                  className="min-h-24 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                />
              </label>

              <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-4">
                <h6 className="text-sm font-semibold text-ink">Line item document</h6>
                <p className="mt-1 text-sm text-slate">
                  Upload the line item document here while creating the GRN.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <input
                    value={createDocumentDraft.documentName}
                    onChange={(event) =>
                      setCreateDocumentDraft((current) => ({
                        ...current,
                        documentName: event.target.value
                      }))
                    }
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                    placeholder="Document name"
                  />
                  <input
                    value={createDocumentDraft.documentType}
                    onChange={(event) =>
                      setCreateDocumentDraft((current) => ({
                        ...current,
                        documentType: event.target.value
                      }))
                    }
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                    placeholder="Document type"
                  />
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_1fr]">
                  <input
                    value={createDocumentDraft.documentUrl}
                    onChange={(event) =>
                      setCreateDocumentDraft((current) => ({
                        ...current,
                        documentUrl: event.target.value
                      }))
                    }
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                    placeholder="Optional URL/path"
                  />
                  <input
                    type="file"
                    onChange={(event) =>
                      setCreateDocumentDraft((current) => ({
                        ...current,
                        file: event.target.files?.[0] ?? null
                      }))
                    }
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none"
                  />
                </div>
              </div>
            </div>

            {successMessage ? (
              <div className="rounded-2xl border border-moss/20 bg-moss/10 px-4 py-4 text-sm text-moss">
                {successMessage}
              </div>
            ) : null}

            {formError ? (
              <div className="rounded-2xl border border-redoxide/20 bg-redoxide/10 px-4 py-4 text-sm text-redoxide">
                {formError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || isReferenceLoading}
              className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-ink/50"
            >
              {isSubmitting ? "Creating GRN..." : "Create GRN"}
            </button>
          </form>
        </article>

        <article className="panel px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-lg font-semibold text-ink">GRN queue</h4>
              <p className="mt-1 text-sm text-slate">
                Keep the creation screen clean and open the queue only when you want to inspect or receive records.
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-[22px] bg-[#f3f6f8] px-5 py-5 text-sm text-slate">
            <p>
              Queue is hidden by default. Use the highlighted link to open the GRN queue and select a record.
            </p>
            <button
              type="button"
              onClick={() => setIsQueueModalOpen(true)}
              className="mt-4 text-sm font-semibold text-steel underline underline-offset-4"
            >
              Open GRN Queue
            </button>
          </div>

          {queueMessage ? (
            <div className="mt-5">
              <div className="rounded-2xl border border-moss/20 bg-moss/10 px-4 py-4 text-sm text-moss">
                {queueMessage}
              </div>
            </div>
          ) : null}
        </article>

      </section>

      <section
        ref={detailSectionRef}
        className={`panel px-6 py-6 transition-all duration-300 ${
          isDetailHighlighted ? "ring-2 ring-steel/60 bg-steel/5" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold text-ink">GRN detail, containers, and labels</h4>
            <p className="mt-1 text-sm text-slate">
              Select a GRN from the list, then open this section to inspect line items, generated containers, and label history.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedGrn ? (
              <span className={`status-pill ${statusTone(selectedGrn.status)}`}>{selectedGrn.status}</span>
            ) : null}
            <button
              type="button"
              onClick={() => setIsDetailOpen((current) => !current)}
              disabled={!selectedGrn}
              className="rounded-2xl bg-mist px-4 py-3 text-sm font-medium text-slate disabled:cursor-not-allowed disabled:text-slate/50"
            >
              {isDetailOpen ? "Hide Detail" : "Open Detail"}
            </button>
          </div>
        </div>

        {isDetailLoading ? <p className="mt-6 text-sm text-slate">Loading GRN detail...</p> : null}

        {!isDetailLoading && !selectedGrn ? (
          <p className="mt-6 text-sm text-slate">No GRN selected yet.</p>
        ) : null}

        {!isDetailLoading && selectedGrn && !isDetailOpen ? (
          <p className="mt-6 text-sm text-slate">GRN detail is hidden. Click Open Detail to view the selected record.</p>
        ) : null}

        {!isDetailLoading && selectedGrn && isDetailOpen ? (
          <div className="mt-6 space-y-6">
            {isDetailHighlighted ? (
              <div className="rounded-2xl border border-steel/20 bg-steel/10 px-4 py-3 text-sm text-steel">
                Selected GRN opened below. Use the container links to view sampling label details.
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-ink/10 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate">GRN</p>
                <p className="mt-2 text-lg font-semibold text-ink">{selectedGrn.grnNumber}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate">Receipt date</p>
                <p className="mt-2 text-lg font-semibold text-ink">{selectedGrn.receiptDate}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate">Invoice</p>
                <p className="mt-2 text-lg font-semibold text-ink">
                  {selectedGrn.invoiceNumber || "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-ink/10 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate">Items</p>
                <p className="mt-2 text-lg font-semibold text-ink">{selectedGrn.items.length}</p>
              </div>
            </div>

            {selectedGrn.items.map((item) => {
              const material = materials.find((entry) => entry.id === item.materialId);
              const batch = item.batchId ? batches.find((entry) => entry.id === item.batchId) : null;
              const pallet = item.palletId ? pallets.find((entry) => entry.id === item.palletId) : null;
              const containers = itemContainers[item.id] ?? [];

              return (
                <article key={item.id} className="rounded-3xl border border-ink/10 bg-white/70 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate">
                        Line {item.lineNumber}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-ink">
                        {material
                          ? `${material.materialCode} - ${material.materialName}`
                          : item.materialId}
                      </p>
                    </div>
                    <span className="status-pill bg-ink/5 text-ink">{item.qcStatus}</span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate md:grid-cols-2 xl:grid-cols-5">
                    <p>Batch: {batch ? batch.batchNumber : item.batchId || "Not set"}</p>
                    <p>Pallet: {pallet ? pallet.palletCode : item.palletId || "Not set"}</p>
                    <p>Received: {item.receivedQuantity} {item.uom}</p>
                    <p>Accepted: {item.acceptedQuantity} {item.uom}</p>
                    <p>Containers: {item.numberOfContainers}</p>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="rounded-3xl border border-ink/10 bg-white p-5">
                      <h5 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate">
                        Line Item Documents
                      </h5>
                      <div className="mt-4 space-y-3 text-sm">
                        {item.documents.length === 0 ? (
                          <p className="text-slate">No documents uploaded for this line item yet.</p>
                        ) : (
                          item.documents.map((document) => (
                            <div key={document.id} className="rounded-2xl border border-ink/10 px-4 py-4">
                              <p className="font-medium text-ink">{document.documentName}</p>
                              <p className="mt-1 text-slate">{document.documentType} • {document.fileName}</p>
                              <p className="mt-1 text-slate">
                                {document.documentPath ?? document.documentUrl ?? "Path unavailable"}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <h5 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate">
                      Containers
                    </h5>
                    {containers.length === 0 ? (
                      <p className="text-sm text-slate">No containers generated yet for this line item.</p>
                    ) : (
                      containers.map((container) => (
                        <div key={container.id} className="rounded-2xl border border-ink/10 px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-ink">
                                {container.containerNumber} / {container.internalLot}
                              </p>
                              <p className="mt-1 text-sm text-slate">
                                {container.quantity} {container.uom} • {container.inventoryStatus}
                              </p>
                            </div>
                            <span className="status-pill bg-steel/15 text-steel">
                              {container.labelStatus}
                            </span>
                          </div>

                          <div className="mt-4 space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">
                              Sampling labels
                            </p>
                            <button
                              type="button"
                              onClick={() => setActiveLabelContainer(container)}
                              className="text-sm font-semibold text-steel underline underline-offset-4"
                            >
                              View Sampling Label Details
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      {isQueueModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/30 px-4" onClick={() => setIsQueueModalOpen(false)}>
          <div
            className="max-h-[85vh] w-full max-w-6xl overflow-hidden rounded-[28px] border border-ink/10 bg-white shadow-float"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
              <div>
                <h4 className="text-lg font-semibold text-ink">GRN Queue</h4>
                <p className="mt-1 text-sm text-slate">Open a GRN, review it, or receive it from this popup.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsQueueModalOpen(false)}
                className="rounded-full border border-ink/10 px-3 py-2 text-sm text-ink"
              >
                Close
              </button>
            </div>
            <div className="max-h-[68vh] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-ink/5 text-slate">
                  <tr>
                    <th className="px-6 py-4 font-medium">GRN</th>
                    <th className="px-6 py-4 font-medium">Receipt Date</th>
                    <th className="px-6 py-4 font-medium">Items</th>
                    <th className="px-6 py-4 font-medium">Received</th>
                    <th className="px-6 py-4 font-medium">Accepted</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr className="border-t border-ink/10">
                      <td className="px-6 py-8 text-slate" colSpan={7}>
                        Loading GRNs from {getApiBaseUrl()}
                      </td>
                    </tr>
                  ) : null}

                  {!isLoading && error ? (
                    <tr className="border-t border-ink/10">
                      <td className="px-6 py-8" colSpan={7}>
                        <div className="rounded-2xl border border-redoxide/20 bg-redoxide/10 px-4 py-4 text-sm text-redoxide">
                          Could not load GRNs. {error}. Confirm the backend is running on {getApiBaseUrl()}.
                        </div>
                      </td>
                    </tr>
                  ) : null}

                  {!isLoading && !error && page?.content.length === 0 ? (
                    <tr className="border-t border-ink/10">
                      <td className="px-6 py-8 text-slate" colSpan={7}>
                        No GRNs found yet.
                      </td>
                    </tr>
                  ) : null}

                  {!isLoading &&
                    !error &&
                    page?.content.map((grn) => (
                      <tr key={grn.id} className="border-t border-ink/10">
                        <td className="px-6 py-4 text-ink">
                          <div>
                            <p className="font-semibold">{grn.grnNumber}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate">
                              {grn.invoiceNumber}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-ink">{grn.receiptDate}</td>
                        <td className="px-6 py-4 text-ink">{summarizeMaterials(grn)}</td>
                        <td className="px-6 py-4 text-ink">{sumQuantity(grn, "receivedQuantity")}</td>
                        <td className="px-6 py-4 text-ink">{sumQuantity(grn, "acceptedQuantity")}</td>
                        <td className="px-6 py-4 text-ink">
                          <span className={`status-pill ${statusTone(grn.status)}`}>{grn.status}</span>
                        </td>
                        <td className="px-6 py-4 text-ink">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                void handleSelectGrn(grn.id, { focusDetail: true });
                                setIsQueueModalOpen(false);
                              }}
                              className="rounded-2xl border border-ink/10 bg-white px-4 py-2 text-sm font-medium text-ink"
                            >
                              View Details
                            </button>
                            {grn.status === "DRAFT" ? (
                              <button
                                type="button"
                                onClick={() => handleReceive(grn.id)}
                                disabled={receivingGrnId === grn.id}
                                className="rounded-2xl bg-steel px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-steel/50"
                              >
                                {receivingGrnId === grn.id ? "Receiving..." : "Receive"}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!isLoading && !error && page ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 px-6 py-4 text-sm text-slate">
                <p>
                  Showing {page.content.length} of {page.totalElements} GRNs
                </p>
                <div className="flex items-center gap-3">
                  <p>
                    Page {page.number + 1} of {Math.max(page.totalPages, 1)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((current) => Math.max(0, current - 1))}
                    disabled={page.first}
                    className="rounded-2xl border border-ink/10 px-4 py-2 text-ink disabled:cursor-not-allowed disabled:text-slate/50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((current) => current + 1)}
                    disabled={page.last}
                    className="rounded-2xl border border-ink/10 px-4 py-2 text-ink disabled:cursor-not-allowed disabled:text-slate/50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
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
