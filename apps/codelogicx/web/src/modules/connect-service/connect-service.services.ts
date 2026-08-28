import { apiPlatformPost } from "../../shared/api/codelogicx-api";

export type ServicePairing = {
  code: string;
  expiresAt: string;
  pairingUrl: string;
  payload: string;
};

export const createServicePairing = () => apiPlatformPost<ServicePairing>("/auth/service-pairing");
