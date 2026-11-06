locals {
  bucket_name = "${var.name_prefix}-passports"
}

resource "yandex_iam_service_account" "passport_backend" {
  folder_id   = var.folder_id
  name        = "${var.name_prefix}-passport-api"
  description = "Runtime access to private documents and passport objects; no bucket or key administration"

  lifecycle {
    prevent_destroy = true
  }
}

resource "yandex_kms_symmetric_key" "passport" {
  folder_id           = var.folder_id
  name                = "${var.name_prefix}-passports"
  default_algorithm   = "AES_256"
  rotation_period     = "2160h" # 90 days; previous versions must remain available for decryption.
  deletion_protection = true

  lifecycle {
    prevent_destroy = true
  }
}

resource "yandex_kms_symmetric_key_iam_member" "passport_backend" {
  symmetric_key_id = yandex_kms_symmetric_key.passport.id
  role             = "kms.keys.encrypterDecrypter"
  member           = "serviceAccount:${yandex_iam_service_account.passport_backend.id}"
}

resource "yandex_storage_bucket" "passport" {
  folder_id             = var.folder_id
  bucket                = local.bucket_name
  force_destroy         = false
  max_size              = var.bucket_max_size_bytes
  default_storage_class = "STANDARD"

  anonymous_access_flags {
    read        = false
    list        = false
    config_read = false
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = yandex_kms_symmetric_key.passport.id
        sse_algorithm     = "aws:kms"
      }
    }
  }

  versioning {
    enabled = false # Suspend version creation; an enabled bucket cannot become unversioned.
  }

  lifecycle_rule {
    id      = "expire-replaced-versions"
    enabled = true
    noncurrent_version_expiration {
      days = var.noncurrent_retention_days
    }
  }

  lifecycle_rule {
    id      = "remove-empty-delete-markers"
    enabled = true
    expiration {
      expired_object_delete_marker = true
    }
  }

  lifecycle_rule {
    id                                     = "abort-incomplete-uploads"
    enabled                                = true
    abort_incomplete_multipart_upload_days = 1
  }


  # No CDN, website, CORS or public ACL grants for passport storage.
  depends_on = [yandex_kms_symmetric_key_iam_member.passport_backend]

  lifecycle {
    prevent_destroy = true
  }
}

# Private, named grants only: provisioning control and backend data operations.
# Bucket policy restricts backend access to passports/* and documents/*; no public grants.
resource "yandex_storage_bucket_grant" "passport_private" {
  bucket = yandex_storage_bucket.passport.bucket

  grant {
    type        = "CanonicalUser"
    id          = var.terraform_service_account_id
    permissions = ["FULL_CONTROL"]
  }

  grant {
    type        = "CanonicalUser"
    id          = yandex_iam_service_account.passport_backend.id
    permissions = ["READ", "WRITE"]
  }
}

resource "yandex_storage_bucket_policy" "passport" {
  bucket = yandex_storage_bucket.passport.bucket
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "TerraformManagement"
        Effect    = "Allow"
        Principal = { CanonicalUser = var.terraform_service_account_id }
        Action    = "s3:*"
        Resource  = ["arn:aws:s3:::${local.bucket_name}", "arn:aws:s3:::${local.bucket_name}/*"]
      },
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = ["arn:aws:s3:::${local.bucket_name}", "arn:aws:s3:::${local.bucket_name}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
      {
        Sid       = "RequireKmsForUploads"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "arn:aws:s3:::${local.bucket_name}/*"
        Condition = { StringNotEqualsIfExists = { "s3:x-amz-server-side-encryption" = "aws:kms" } }
      },
      {
        Sid       = "RequireThisBucketKey"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "arn:aws:s3:::${local.bucket_name}/*"
        Condition = { StringNotEqualsIfExists = { "s3:x-amz-server-side-encryption-aws-kms-key-id" = yandex_kms_symmetric_key.passport.id } }
      },
      {
        Sid       = "BackendObjectAccess"
        Effect    = "Allow"
        Principal = { CanonicalUser = yandex_iam_service_account.passport_backend.id }
        Action    = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:GetObjectVersion", "s3:DeleteObjectVersion"]
        Resource  = ["arn:aws:s3:::${local.bucket_name}/passports/*", "arn:aws:s3:::${local.bucket_name}/documents/*"]
      },
      {
        Sid       = "BackendListForErasure"
        Effect    = "Allow"
        Principal = { CanonicalUser = yandex_iam_service_account.passport_backend.id }
        Action    = ["s3:ListBucket", "s3:ListBucketVersions"]
        Resource  = "arn:aws:s3:::${local.bucket_name}"
        Condition = { StringLike = { "s3:prefix" = ["passports/*", "documents/*"] } }
      }
    ]
  })

}
