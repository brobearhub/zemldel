# Attach the already-owned domain to DNS hosting; no registration or transfer.
resource "restapi_object" "domain" {
  provider                = restapi.domain
  path                    = "/api/v1/domains"
  object_id               = var.domain
  id_attribute            = "domain/fqdn"
  create_path             = "/api/v1/add-domain/{id}"
  data                    = "{}"
  ignore_server_additions = true
  lifecycle {
    prevent_destroy = true
  }
}

data "twc_dns_zone" "prod" {
  name       = var.domain
  depends_on = [restapi_object.domain]
}

resource "twc_dns_rr" "cdn" {
  zone_id = data.twc_dns_zone.prod.id
  name    = "cdn"
  type    = "CNAME"
  value   = jsondecode(restapi_object.cdn.api_response).http_resource.cdn_domain
}

resource "twc_dns_rr" "application_and_mail" {
  for_each = var.dns_records
  zone_id  = data.twc_dns_zone.prod.id
  name     = each.value.name
  type     = each.value.type
  value    = each.value.value
}
