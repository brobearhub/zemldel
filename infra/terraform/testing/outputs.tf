locals {
  s3_endpoint     = "https://${trimprefix(twc_s3_bucket.media["public"].hostname, "https://")}"
  public_base_url = "${local.s3_endpoint}/${twc_s3_bucket.media["public"].full_name}"
}

output "backend_storage_environment" {
  sensitive = true
  value = {
    NODE_ENV            = "testing"
    S3_ENDPOINT         = local.s3_endpoint
    S3_REGION           = "ru-1"
    S3_KEY              = twc_s3_user.backend.access_key
    S3_SECRET           = twc_s3_user.backend.secret_key
    S3_PUBLIC_BUCKET    = twc_s3_bucket.media["public"].full_name
    S3_PRIVATE_BUCKET   = twc_s3_bucket.media["public"].full_name
    S3_FORCE_PATH_STYLE = "true"
    S3_PUBLIC_PREFIX    = "public/"
    S3_PRIVATE_PREFIX   = "private/"
    # Existing backend URL builder supports an S3 path-style base, no CDN needed.
    CDN_PUBLIC_BASE_URL = local.public_base_url
  }
}

output "frontend_storage_environment" {
  value = {
    NEXT_PUBLIC_S3_ENDPOINT         = local.s3_endpoint
    NEXT_PUBLIC_S3_PUBLIC_BUCKET    = twc_s3_bucket.media["public"].full_name
    NEXT_PUBLIC_S3_FORCE_PATH_STYLE = "true"
  }
}

output "public_media_base_url" {
  value = local.public_base_url
}
