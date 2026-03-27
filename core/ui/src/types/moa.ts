export type Moa = {
  id: string;
  moaCode: string;
  moaName: string;
  revision: string | null;
  referenceAttachment: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
};

export type CreateMoaRequest = {
  moaCode: string;
  moaName: string;
  revision?: string;
  referenceAttachment?: string;
  createdBy: string;
};
