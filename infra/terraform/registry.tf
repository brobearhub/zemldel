resource "yandex_container_registry" "main" {
  name = "${var.resource_prefix}-cr"
}
