import type { RequestCustomerDto, RequestDocumentRequestDto } from "@/entities/request";
import { isOrderExecutionStatus } from "@/entities/request";
import type { CustomerContractBundleListItem } from "@/features/request-contract-files/ui/CustomerRequestContractFilesClient";

export function canCustomerAcceptContract(input: {
  requestStatus: RequestCustomerDto["status"];
  lockedAt: RequestCustomerDto["lockedAt"];
  contractBundles: readonly CustomerContractBundleListItem[];
  documentRequests: readonly RequestDocumentRequestDto[];
}) {
  const allContractBundlesApproved =
    input.contractBundles.length > 0 &&
    input.contractBundles.every((b) => b.status === "APPROVED" && Boolean(b.signature));
  const allRequestedDocumentsUploaded = input.documentRequests.every((d) => d.status === "UPLOADED");
  return (
    Boolean(input.lockedAt) &&
    !isOrderExecutionStatus(input.requestStatus) &&
    allContractBundlesApproved &&
    allRequestedDocumentsUploaded
  );
}
