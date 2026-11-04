resource "yandex_dns_zone" "prod" {
  name        = "${var.name_prefix}-dns"
  description = "Delegate at the registrar only after apps and all mail records are ready."
  zone        = "${var.domain}."
  public      = true
  labels      = local.labels
  lifecycle {
    prevent_destroy = true
  }
}

resource "yandex_dns_recordset" "app" {
  for_each = var.publish_application_dns ? {
    frontend = { name = "${var.domain}.", address = yandex_vpc_address.app["frontend"].external_ipv4_address[0].address }
    www      = { name = "www.${var.domain}.", address = yandex_vpc_address.app["frontend"].external_ipv4_address[0].address }
    backend  = { name = "api.${var.domain}.", address = yandex_vpc_address.app["backend"].external_ipv4_address[0].address }
  } : {}
  zone_id = yandex_dns_zone.prod.id
  name    = each.value.name
  type    = "A"
  ttl     = 600
  data    = [each.value.address]
}

resource "yandex_dns_recordset" "extra" {
  for_each = var.extra_dns_records
  zone_id  = yandex_dns_zone.prod.id
  name     = each.value.name == "@" ? "${var.domain}." : "${each.value.name}.${var.domain}."
  type     = each.value.type
  ttl      = each.value.ttl
  data     = each.value.data
}
