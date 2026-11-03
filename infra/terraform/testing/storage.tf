resource "twc_s3_bucket" "media" {
  for_each              = toset(["public", "private"])
  name                  = "zemledel-testing-${each.key}"
  type                  = each.key
  preset_id             = var.s3_preset_id
  is_allow_auto_upgrade = false
  description           = each.key == "public" ? "Public testing images; direct S3 delivery" : "Private documents; backend access only"
  lifecycle {
    prevent_destroy = true
  }
}

# Backend currently uses one S3Client for both buckets, hence a service account.
# Timeweb S3 user scope is the account's storage, not only these two buckets.
resource "twc_s3_user" "backend" {
  name   = "zemledel-testing-backend"
  status = "active"
  lifecycle {
    prevent_destroy = true
  }
}
