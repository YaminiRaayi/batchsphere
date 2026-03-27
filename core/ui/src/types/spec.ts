import type { SamplingMethod } from "./sampling";

export type Spec = {
  id: string;
  specCode: string;
  specName: string;
  revision: string | null;
  samplingMethod: SamplingMethod;
  referenceAttachment: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
};

export type CreateSpecRequest = {
  specCode: string;
  specName: string;
  revision?: string;
  samplingMethod: SamplingMethod;
  referenceAttachment?: string;
  createdBy: string;
};
