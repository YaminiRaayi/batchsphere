export type SamplingTool = {
  id: string;
  toolCode: string;
  toolName: string;
  description: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateSamplingToolRequest = {
  toolCode: string;
  toolName: string;
  description?: string;
  createdBy: string;
};
