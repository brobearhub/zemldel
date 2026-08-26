resource "yandex_cm_certificate" "cdn" {
  name    = "${var.resource_prefix}-cdn-cert"
  domains = [var.cdn_domain]

  managed {
    challenge_type = "DNS_CNAME"
  }
}

resource "yandex_cdn_origin_group" "public" {
  name     = "${var.resource_prefix}-cdn-origin"
  use_next = true

  origin {
    source = yandex_storage_bucket.public.bucket_domain_name
  }
}

resource "yandex_cdn_resource" "public" {
  cname           = var.cdn_domain
  active          = true
  origin_group_id = yandex_cdn_origin_group.public.id
  origin_protocol = "HTTP"

  ssl_certificate {
    type                   = "certificate_manager"
    certificate_manager_id = yandex_cm_certificate.cdn.id
  }

  options {
    browser_cache_settings = 3600
    edge_cache_settings    = 604800
    ignore_cookie          = true
  }
}
