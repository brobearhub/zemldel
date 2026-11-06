# Cloud Logging is closed to new customers. Keep audit objects separate from
# application objects so the runtime identity cannot read or erase its own trail.
resource "yandex_iam_service_account" "document_audit" {
  folder_id   = var.folder_id
  name        = "${var.name_prefix}-document-audit"
  description = "Private document audit delivery; no passport read or delete access"

  lifecycle {
    prevent_destroy = true
  }
}

# audit-trails.viewer on the folder is bootstrapped by its administrator.
# Do not give the provisioner folder-wide IAM administration just to add it.
resource "yandex_kms_symmetric_key" "document_audit" {
  folder_id           = var.folder_id
  name                = "${var.name_prefix}-document-audit"
  default_algorithm   = "AES_256"
  rotation_period     = "2160h"
  deletion_protection = true

  lifecycle {
    prevent_destroy = true
  }
}

resource "yandex_kms_symmetric_key_iam_member" "document_audit" {
  symmetric_key_id = yandex_kms_symmetric_key.document_audit.id
  role             = "kms.keys.encrypter"
  member           = "serviceAccount:${yandex_iam_service_account.document_audit.id}"
}

resource "yandex_storage_bucket" "document_audit" {
  folder_id             = var.folder_id
  bucket                = "${var.name_prefix}-document-audit"
  force_destroy         = false
  max_size              = 1073741824
  default_storage_class = "STANDARD"

  anonymous_access_flags {
    read        = false
    list        = false
    config_read = false
  }

  versioning {
    enabled = false
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = yandex_kms_symmetric_key.document_audit.id
        sse_algorithm     = "aws:kms"
      }
    }
  }

  lifecycle_rule {
    id      = "expire-audit-events"
    enabled = true
    prefix  = "events/"
    expiration {
      days = var.audit_retention_days
    }
  }

  lifecycle_rule {
    id                                     = "abort-incomplete-uploads"
    enabled                                = true
    abort_incomplete_multipart_upload_days = 1
  }

  depends_on = [yandex_kms_symmetric_key_iam_member.document_audit]

  lifecycle {
    prevent_destroy = true
  }
}

resource "yandex_storage_bucket_iam_binding" "document_audit" {
  bucket  = yandex_storage_bucket.document_audit.bucket
  role    = "storage.uploader"
  members = ["serviceAccount:${yandex_iam_service_account.document_audit.id}"]
}

resource "yandex_storage_bucket_policy" "document_audit" {
  bucket = yandex_storage_bucket.document_audit.bucket
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "TerraformManagement"
        Effect    = "Allow"
        Principal = { CanonicalUser = var.terraform_service_account_id }
        Action    = "s3:*"
        Resource  = ["arn:aws:s3:::${yandex_storage_bucket.document_audit.bucket}", "arn:aws:s3:::${yandex_storage_bucket.document_audit.bucket}/*"]
      },
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = ["arn:aws:s3:::${yandex_storage_bucket.document_audit.bucket}", "arn:aws:s3:::${yandex_storage_bucket.document_audit.bucket}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
      {
        Sid       = "AuditDelivery"
        Effect    = "Allow"
        Principal = { CanonicalUser = yandex_iam_service_account.document_audit.id }
        Action    = "s3:PutObject"
        Resource  = "arn:aws:s3:::${yandex_storage_bucket.document_audit.bucket}/events/*"
      },
      {
        Sid       = "DenyAuditErasure"
        Effect    = "Deny"
        Principal = { CanonicalUser = yandex_iam_service_account.document_audit.id }
        Action    = ["s3:DeleteObject", "s3:DeleteObjectVersion"]
        Resource  = "arn:aws:s3:::${yandex_storage_bucket.document_audit.bucket}/*"
      },
      {
        Sid       = "DenyApplicationAccess"
        Effect    = "Deny"
        Principal = { CanonicalUser = yandex_iam_service_account.passport_backend.id }
        Action    = "s3:*"
        Resource  = ["arn:aws:s3:::${yandex_storage_bucket.document_audit.bucket}", "arn:aws:s3:::${yandex_storage_bucket.document_audit.bucket}/*"]
      }
    ]
  })
}

resource "yandex_audit_trails_trail" "private_documents" {
  folder_id          = var.folder_id
  name               = "${var.name_prefix}-private-documents"
  description        = "Folder management events and private document storage/KMS data events"
  service_account_id = yandex_iam_service_account.document_audit.id

  storage_destination {
    bucket_name        = yandex_storage_bucket.document_audit.bucket
    object_prefix      = "events/"
    aggregation_period = "5m"
  }

  filtering_policy {
    management_events_filter {
      resource_scope {
        resource_id   = var.folder_id
        resource_type = "resource-manager.folder"
      }
    }
    data_events_filter {
      service = "storage"
      resource_scope {
        resource_id   = var.folder_id
        resource_type = "resource-manager.folder"
      }
      include_rule {
        condition {
          field    = "$.details.bucket_id"
          operator = "IN"
          values   = [yandex_storage_bucket.passport.bucket]
        }
      }
    }
    data_events_filter {
      service = "kms"
      resource_scope {
        resource_id   = var.folder_id
        resource_type = "resource-manager.folder"
      }
      include_rule {
        condition {
          field    = "$.details.key_id"
          operator = "IN"
          values   = [yandex_kms_symmetric_key.passport.id]
        }
      }
      # The audit bucket uses a separate key, outside this filter. Its own
      # encryption operations must not generate an audit feedback loop.
    }
  }

  depends_on = [
    yandex_storage_bucket_iam_binding.document_audit,
    yandex_storage_bucket_policy.document_audit,
  ]
}
