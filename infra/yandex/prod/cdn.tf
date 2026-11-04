resource "yandex_cdn_origin_group" "media" {
  name          = "${var.name_prefix}-media"
  provider_type = "ourcdn"
  use_next      = true
  origin {
    source  = "${yandex_storage_bucket.media["public"].bucket}.storage.yandexcloud.net"
    enabled = true
  }
}

resource "yandex_cm_certificate" "cdn" {
  name                = "${var.name_prefix}-cdn"
  domains             = ["cdn.${var.domain}"]
  deletion_protection = true
  managed {
    challenge_type  = "DNS_CNAME"
    challenge_count = 1
  }
}

resource "yandex_dns_recordset" "cdn_validation" {
  zone_id = yandex_dns_zone.prod.id
  name    = yandex_cm_certificate.cdn.challenges[0].dns_name
  type    = yandex_cm_certificate.cdn.challenges[0].dns_type
  data    = [yandex_cm_certificate.cdn.challenges[0].dns_value]
  ttl     = 60
}

data "yandex_cm_certificate" "cdn_ready" {
  count           = var.enable_cdn_tls ? 1 : 0
  certificate_id  = yandex_cm_certificate.cdn.id
  wait_validation = true
  depends_on      = [yandex_dns_recordset.cdn_validation]
}

resource "yandex_cdn_resource" "media" {
  cname           = "cdn.${var.domain}"
  active          = true
  provider_type   = "ourcdn"
  origin_protocol = "https"
  origin_group_id = yandex_cdn_origin_group.media.id
  options {
    custom_host_header     = "${yandex_storage_bucket.media["public"].bucket}.storage.yandexcloud.net"
    allowed_http_methods   = ["GET", "HEAD", "OPTIONS"]
    edge_cache_settings    = 3600
    ignore_cookie          = true
    ignore_query_params    = false
    redirect_http_to_https = var.enable_cdn_tls
  }
  ssl_certificate {
    type                   = var.enable_cdn_tls ? "certificate_manager" : "not_used"
    certificate_manager_id = var.enable_cdn_tls ? data.yandex_cm_certificate.cdn_ready[0].id : null
  }
  lifecycle {
    prevent_destroy = true
  }
  depends_on = [yandex_storage_bucket_policy.media]
}

resource "yandex_dns_recordset" "cdn" {
  zone_id = yandex_dns_zone.prod.id
  name    = "cdn.${var.domain}."
  type    = "CNAME"
  ttl     = 600
  data    = ["${trimsuffix(yandex_cdn_resource.media.provider_cname, ".")}."]
}
