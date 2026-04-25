import type { MasterDataSection } from "./MasterDataPage";

export type MasterDataNavItem = {
  title: string;
  description: string;
  to: string;
  section: MasterDataSection;
};

export type MasterDataNavGroup = {
  title: string;
  description: string;
  accent: string;
  items: MasterDataNavItem[];
};

export const masterDataNavGroups: MasterDataNavGroup[] = [
  {
    title: "Partners",
    description: "Supplier, vendor, and vendor business unit records used across procurement and receipt flows.",
    accent: "bg-[#243041] text-white",
    items: [
      {
        title: "Suppliers",
        description: "Inbound partner records and approved contacts.",
        to: "/master-data/partners/suppliers",
        section: "supplier"
      },
      {
        title: "Vendors",
        description: "Procurement-facing vendor masters and business ownership.",
        to: "/master-data/partners/vendors",
        section: "vendor"
      },
      {
        title: "Vendor Business Units",
        description: "Optional vendor operating-unit structure.",
        to: "/master-data/partners/vendor-business-units",
        section: "vendorBusinessUnit"
      }
    ]
  },
  {
    title: "Materials",
    description: "Material attributes that drive storage, sampling, and release behavior across operations.",
    accent: "bg-[#13a7b8] text-white",
    items: [
      {
        title: "Materials",
        description: "Sampling, storage, and release-driving material rules.",
        to: "/master-data/materials/materials",
        section: "material"
      }
    ]
  },
  {
    title: "QC References",
    description: "Reference records used by sampling, specifications, and future LIMS workflows.",
    accent: "bg-white text-ink border border-ink/10",
    items: [
      {
        title: "Specs",
        description: "Sampling strategy and revision-controlled specifications.",
        to: "/master-data/qc-refs/specs",
        section: "spec"
      },
      {
        title: "MoA",
        description: "Method of analysis reference set.",
        to: "/master-data/qc-refs/moa",
        section: "moa"
      },
      {
        title: "Sampling Tools",
        description: "QC tools used in planning and execution.",
        to: "/master-data/qc-refs/sampling-tools",
        section: "samplingTool"
      }
    ]
  }
];
