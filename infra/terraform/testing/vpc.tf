resource "twc_vpc" "testing" {
  name        = "zemledel-testing"
  description = "Testing database and manually managed AppPlatform apps"
  subnet_v4   = "192.168.20.0/24"
  location    = "ru-3"

  lifecycle {
    prevent_destroy = true
  }
}
