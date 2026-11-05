locals {
  managed_domains = toset([var.domain])
}

# Domain names are resource keys: changing the name creates a new DNS-hosting attachment.
resource "restapi_object" "domain" {
  for_each     = local.managed_domains
  provider     = restapi.domain
  path         = "/api/v1/domains"
  object_id    = each.key
  id_attribute = "domain/fqdn"
  create_path  = "/api/v1/add-domain/{id}"
  # The hostname is immutable (for_each key). Import metadata updates only need
  # a read; sending an empty PUT would call an unsupported domain operation.
  update_method           = "GET"
  data                    = "{}"
  ignore_server_additions = true
  lifecycle {
    create_before_destroy = true
  }
}

data "twc_dns_zone" "prod" {
  for_each   = local.managed_domains
  name       = each.key
  depends_on = [restapi_object.domain]
}

resource "twc_dns_rr" "cdn" {
  for_each = local.managed_domains
  zone_id  = data.twc_dns_zone.prod[each.key].id
  name     = "cdn"
  type     = "CNAME"
  value    = jsondecode(restapi_object.cdn.api_response).http_resource.cdn_domain
}

resource "twc_dns_rr" "application_and_mail" {
  for_each = var.dns_records
  zone_id  = data.twc_dns_zone.prod[var.domain].id
  name     = each.value.name
  type     = each.value.type
  value    = each.value.value
}
