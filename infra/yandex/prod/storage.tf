resource "yandex_iam_service_account" "storage" {
  name        = "${var.name_prefix}-storage"
  description = "Backend access to its two media buckets only."
}

resource "yandex_iam_service_account_static_access_key" "storage" {
  service_account_id = yandex_iam_service_account.storage.id
  description        = "Backend S3 client; stored in Terraform state, treat state as a secret."
}

resource "yandex_storage_bucket" "media" {
  for_each              = toset(["public", "private"])
  bucket                = "${var.name_prefix}-${each.key}-${var.folder_id}"
  folder_id             = var.folder_id
  max_size              = var.bucket_max_size_gb * 1024 * 1024 * 1024
  default_storage_class = "STANDARD"
  force_destroy         = false
  anonymous_access_flags {
    read        = false
    list        = false
    config_read = false
  }
  lifecycle {
    prevent_destroy = true
  }
}

resource "yandex_storage_bucket_policy" "media" {
  for_each = yandex_storage_bucket.media
  bucket   = each.value.bucket
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat([
      {
        Sid       = "BackendObjects"
        Effect    = "Allow"
        Principal = { CanonicalUser = yandex_iam_service_account.storage.id }
        Action    = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:AbortMultipartUpload", "s3:ListMultipartUploadParts"]
        Resource  = "arn:aws:s3:::${each.value.bucket}/*"
      },
      {
        Sid       = "BackendBucket"
        Effect    = "Allow"
        Principal = { CanonicalUser = yandex_iam_service_account.storage.id }
        Action    = ["s3:ListBucket", "s3:GetBucketLocation", "s3:ListBucketMultipartUploads"]
        Resource  = "arn:aws:s3:::${each.value.bucket}"
      }
      ], each.key == "public" ? [
      {
        Sid       = "PublicImagesOnly"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "arn:aws:s3:::${each.value.bucket}/public/*"
      }
    ] : [])
  })
}
