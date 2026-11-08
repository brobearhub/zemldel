resource "twc_s3_bucket" "media" {
  for_each              = toset(["public"])
  name                  = "zemledel-testing-${each.key}"
  type                  = each.key
  preset_id             = var.s3_public_preset_id
  is_allow_auto_upgrade = false
  description           = "Public testing images and synthetic documents; direct S3 delivery"
  lifecycle {
    prevent_destroy = true
  }
}

# Terraform manages a separate key pair for the testing backend.
# Verify the user's actual permissions before using the keys in the app.
resource "twc_s3_user" "backend" {
  name   = "zemledel-testing-backend"
  status = "active"
  lifecycle {
    prevent_destroy = true
  }
}
