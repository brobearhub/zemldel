-- Rename enums
ALTER TYPE "ServiceRequestStatus" RENAME TO "RequestStatus";
ALTER TYPE "ServiceRequestProviderOfferStatus" RENAME TO "RequestProviderOfferStatus";

-- Rename tables
ALTER TABLE "ServiceRequest" RENAME TO "Request";
ALTER TABLE "ServiceRequestEvent" RENAME TO "RequestEvent";
ALTER TABLE "ServiceRequestProviderOffer" RENAME TO "RequestProviderOffer";

-- Rename FK columns
ALTER TABLE "RequestEvent" RENAME COLUMN "serviceRequestId" TO "requestId";
ALTER TABLE "RequestProviderOffer" RENAME COLUMN "serviceRequestId" TO "requestId";
ALTER TABLE "Conversation" RENAME COLUMN "serviceRequestId" TO "requestId";
ALTER TABLE "ContractInstance" RENAME COLUMN "serviceRequestId" TO "requestId";
ALTER TABLE "Payment" RENAME COLUMN "serviceRequestId" TO "requestId";
ALTER TABLE "PassportAccessAudit" RENAME COLUMN "serviceRequestId" TO "requestId";

-- Rename primary key constraints
ALTER INDEX "ServiceRequest_pkey" RENAME TO "Request_pkey";
ALTER INDEX "ServiceRequestEvent_pkey" RENAME TO "RequestEvent_pkey";
ALTER INDEX "ServiceRequestProviderOffer_pkey" RENAME TO "RequestProviderOffer_pkey";

-- Rename foreign-key constraints (Request side)
ALTER TABLE "Request" RENAME CONSTRAINT "ServiceRequest_categoryId_fkey" TO "Request_categoryId_fkey";
ALTER TABLE "Request" RENAME CONSTRAINT "ServiceRequest_customerUserId_fkey" TO "Request_customerUserId_fkey";
ALTER TABLE "Request" RENAME CONSTRAINT "ServiceRequest_providerId_fkey" TO "Request_providerId_fkey";
ALTER TABLE "Request" RENAME CONSTRAINT "ServiceRequest_requestCityId_fkey" TO "Request_requestCityId_fkey";
ALTER TABLE "Request" RENAME CONSTRAINT "ServiceRequest_serviceId_fkey" TO "Request_serviceId_fkey";

-- Rename foreign-key constraints pointing TO Request
ALTER TABLE "ContractInstance" RENAME CONSTRAINT "ContractInstance_serviceRequestId_fkey" TO "ContractInstance_requestId_fkey";
ALTER TABLE "Conversation" RENAME CONSTRAINT "Conversation_serviceRequestId_fkey" TO "Conversation_requestId_fkey";
ALTER TABLE "Payment" RENAME CONSTRAINT "Payment_serviceRequestId_fkey" TO "Payment_requestId_fkey";
ALTER TABLE "RequestEvent" RENAME CONSTRAINT "ServiceRequestEvent_serviceRequestId_fkey" TO "RequestEvent_requestId_fkey";
ALTER TABLE "RequestProviderOffer" RENAME CONSTRAINT "ServiceRequestProviderOffer_serviceRequestId_fkey" TO "RequestProviderOffer_requestId_fkey";
ALTER TABLE "RequestProviderOffer" RENAME CONSTRAINT "ServiceRequestProviderOffer_providerId_fkey" TO "RequestProviderOffer_providerId_fkey";

-- Rename Request indexes
ALTER INDEX "ServiceRequest_categoryId_status_idx" RENAME TO "Request_categoryId_status_idx";
ALTER INDEX "ServiceRequest_customerUserId_status_idx" RENAME TO "Request_customerUserId_status_idx";
ALTER INDEX "ServiceRequest_providerId_status_idx" RENAME TO "Request_providerId_status_idx";
ALTER INDEX "ServiceRequest_requestCityId_status_idx" RENAME TO "Request_requestCityId_status_idx";
ALTER INDEX "ServiceRequest_serviceId_status_idx" RENAME TO "Request_serviceId_status_idx";

-- Rename RequestEvent indexes
ALTER INDEX "ServiceRequestEvent_actorProviderId_createdAt_idx" RENAME TO "RequestEvent_actorProviderId_createdAt_idx";
ALTER INDEX "ServiceRequestEvent_actorUserId_createdAt_idx" RENAME TO "RequestEvent_actorUserId_createdAt_idx";
ALTER INDEX "ServiceRequestEvent_serviceRequestId_createdAt_idx" RENAME TO "RequestEvent_requestId_createdAt_idx";
ALTER INDEX "ServiceRequestEvent_type_createdAt_idx" RENAME TO "RequestEvent_type_createdAt_idx";

-- Rename RequestProviderOffer indexes
ALTER INDEX "ServiceRequestProviderOffer_providerId_status_idx" RENAME TO "RequestProviderOffer_providerId_status_idx";
ALTER INDEX "ServiceRequestProviderOffer_serviceRequestId_providerId_key" RENAME TO "RequestProviderOffer_requestId_providerId_key";
ALTER INDEX "ServiceRequestProviderOffer_serviceRequestId_status_idx" RENAME TO "RequestProviderOffer_requestId_status_idx";

-- Rename Conversation indexes
ALTER INDEX "Conversation_serviceRequestId_idx" RENAME TO "Conversation_requestId_idx";
ALTER INDEX "Conversation_serviceRequestId_providerId_key" RENAME TO "Conversation_requestId_providerId_key";

-- Rename Payment indexes
ALTER INDEX "Payment_serviceRequestId_type_status_idx" RENAME TO "Payment_requestId_type_status_idx";

-- Rename ContractInstance indexes
ALTER INDEX "ContractInstance_serviceRequestId_idx" RENAME TO "ContractInstance_requestId_idx";

-- Rename PassportAccessAudit indexes
ALTER INDEX "PassportAccessAudit_serviceRequestId_createdAt_idx" RENAME TO "PassportAccessAudit_requestId_createdAt_idx";
