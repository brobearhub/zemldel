resource "restapi_object" "cdn" {
  path                    = "/api/v1/cdn/http-resources"
  id_attribute            = "http_resource/id"
  ignore_server_additions = true
  force_new               = ["delivery_domain", "use_https"]
  data = jsonencode({
    name                = "zemledel-prod-media"
    preset_id           = var.cdn_preset_id
    storage_id          = tonumber(twc_s3_bucket.media["public"].id)
    use_https           = true
    delivery_domain     = "cdn.${var.domain}"
    traffic_limit_bytes = var.cdn_traffic_limit_gb * 1024 * 1024 * 1024
  })
  update_data = jsonencode({
    name                = "zemledel-prod-media"
    preset_id           = var.cdn_preset_id
    storage_id          = tonumber(twc_s3_bucket.media["public"].id)
    traffic_limit_bytes = var.cdn_traffic_limit_gb * 1024 * 1024 * 1024
  })
  lifecycle {
    prevent_destroy = true
  }
}

# Timeweb exposes certificate issuance as an asynchronous action, not CRUD.
# The action is idempotently checked by the helper; it does not delete certs.
resource "terraform_data" "cdn_tls" {
  count            = var.enable_cdn_tls ? 1 : 0
  triggers_replace = [restapi_object.cdn.id, var.domain]
  depends_on       = [twc_dns_rr.cdn]
  provisioner "local-exec" {
    command = "python3 \"${path.module}/scripts/ensure-cdn-tls.py\""
    environment = {
      TWC_TOKEN  = var.timeweb_token
      CDN_ID     = restapi_object.cdn.id
      CDN_DOMAIN = "cdn.${var.domain}"
      CDN_TARGET = jsondecode(restapi_object.cdn.api_response).http_resource.cdn_domain
    }
  }
}
