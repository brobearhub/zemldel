output "servers" {
  value = {
    for role, vm in yandex_compute_instance.app : role => {
      id         = vm.id
      public_ip  = vm.network_interface[0].nat_ip_address
      private_ip = vm.network_interface[0].ip_address
      ssh        = "ssh ubuntu@${vm.network_interface[0].nat_ip_address}"
    }
  }
}

output "registry" {
  value = "cr.yandex/${yandex_container_registry.prod.id}"
}

output "urls" {
  value = {
    frontend = "https://${var.domain}"
    backend  = "https://api.${var.domain}"
    cdn      = "https://cdn.${var.domain}"
  }
}

output "backend_storage_environment" {
  sensitive = true
  value = {
    S3_ENDPOINT         = "https://storage.yandexcloud.net"
    S3_REGION           = "ru-central1"
    S3_KEY              = yandex_iam_service_account_static_access_key.storage.access_key
    S3_SECRET           = yandex_iam_service_account_static_access_key.storage.secret_key
    S3_PUBLIC_BUCKET    = yandex_storage_bucket.media["public"].bucket
    S3_PRIVATE_BUCKET   = yandex_storage_bucket.media["private"].bucket
    S3_FORCE_PATH_STYLE = "true"
    S3_PUBLIC_PREFIX    = "public/"
    S3_PRIVATE_PREFIX   = "private/"
    CDN_PUBLIC_BASE_URL = "https://cdn.${var.domain}"
  }
}

output "frontend_environment" {
  value = {
    NEXTAUTH_URL                    = "https://${var.domain}"
    BACKEND_API_URL                 = "http://${local.applications.backend.private_ip}:3003"
    NEXT_PUBLIC_CHAT_SOCKET_URL     = "https://api.${var.domain}"
    NEXT_PUBLIC_S3_ENDPOINT         = "https://storage.yandexcloud.net"
    NEXT_PUBLIC_S3_PUBLIC_BUCKET    = yandex_storage_bucket.media["public"].bucket
    NEXT_PUBLIC_S3_FORCE_PATH_STYLE = "true"
  }
}

output "cdn_dns_challenge" {
  value = {
    name  = yandex_cm_certificate.cdn.challenges[0].dns_name
    type  = yandex_cm_certificate.cdn.challenges[0].dns_type
    value = yandex_cm_certificate.cdn.challenges[0].dns_value
  }
}

output "cdn_certificate_status" {
  value = var.enable_cdn_tls ? data.yandex_cm_certificate.cdn_ready[0].status : yandex_cm_certificate.cdn.status
}

output "database_firewall_source_ipv4" {
  description = "Allow this source /32 at the existing external PostgreSQL; no DB resources are created here."
  value       = "${yandex_vpc_address.app["backend"].external_ipv4_address[0].address}/32"
}
