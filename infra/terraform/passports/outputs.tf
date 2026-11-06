output "passport_storage" {
  description = "Non-secret integration contract for the private document backend."
  value = {
    endpoint                  = "https://storage.yandexcloud.net"
    region                    = "ru-central1"
    force_path_style          = true
    service_account_id        = yandex_iam_service_account.passport_backend.id
    bucket                    = yandex_storage_bucket.passport.bucket
    kms_key_id                = yandex_kms_symmetric_key.passport.id
    object_prefix             = "passports/"
    server_side_encryption    = "aws:kms"
    versioning_enabled        = false
    noncurrent_retention_days = var.noncurrent_retention_days
  }
}

output "document_audit" {
  description = "Non-secret audit identifiers. Folder audit-trails.viewer binding requires administrator bootstrap."
  value = {
    service_account_id = yandex_iam_service_account.document_audit.id
    bucket             = yandex_storage_bucket.document_audit.bucket
    trail_id           = yandex_audit_trails_trail.private_documents.id
    retention_days     = var.audit_retention_days
  }
}
