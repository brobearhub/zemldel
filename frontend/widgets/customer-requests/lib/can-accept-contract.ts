import type { RequestCustomerDto, RequestDocumentRequestDto } from "@/entities/request";
import type { CustomerContractFileListItem } from "@/features/request-contract-files/ui/CustomerRequestContractFilesClient";

export function canCustomerAcceptContract(input: {
  requestStatus: RequestCustomerDto["status"];
  contractFiles: readonly CustomerContractFileListItem[];
  documentRequests: readonly RequestDocumentRequestDto[];
}) {
  const allProviderDocumentsApproved =
    input.contractFiles.length > 0 && input.contractFiles.every((f) => f.status === "APPROVED");
  const allRequestedDocumentsUploaded = input.documentRequests.every((d) => d.status === "UPLOADED");
  return input.requestStatus === "PROVIDER_SELECTED" && allProviderDocumentsApproved && allRequestedDocumentsUploaded;
}

