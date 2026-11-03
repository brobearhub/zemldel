resource "twc_vpc" "prod" {
  count       = var.existing_vpc_id == null ? 1 : 0
  name        = "zemledel-prod"
  description = "Production database and manually managed AppPlatform apps"
  subnet_v4   = "192.168.10.0/24"
  location    = "ru-3"

  lifecycle {
    prevent_destroy = true
  }
}

locals {
  vpc_id = var.existing_vpc_id != null ? var.existing_vpc_id : twc_vpc.prod[0].id
}
