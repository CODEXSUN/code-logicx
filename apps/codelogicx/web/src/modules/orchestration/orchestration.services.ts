import { apiGet } from "../../shared/api/codelogicx-api";
import type { OrchestrationCatalog } from "./orchestration.types";

export function getOrchestrationCatalog() {
  return apiGet<OrchestrationCatalog>("/orchestration/catalog");
}
