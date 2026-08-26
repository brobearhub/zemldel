output "vm_public_ip" {
  description = "Публичный IP ВМ — A-запись для domain"
  value       = yandex_compute_instance.app.network_interface[0].nat_ip_address
}

output "vm_internal_ip" {
  value = yandex_compute_instance.app.network_interface[0].ip_address
}

output "container_registry_id" {
  value = yandex_container_registry.main.id
}

output "container_registry_url" {
  description = "CR_REGISTRY для deploy/.deploy.env"
  value       = "cr.yandex/${yandex_container_registry.main.id}"
}

output "postgres_rw_fqdn" {
  value = local.pg_rw_fqdn
}

output "postgres_database_url" {
  description = "DATABASE_URL для Lockbox (sensitive)"
  value       = local.pg_database_url
  sensitive   = true
}

output "public_bucket_name" {
  value = yandex_storage_bucket.public.bucket
}

output "private_bucket_name" {
  value = yandex_storage_bucket.private.bucket
}

output "cdn_provider_cname" {
  description = "CNAME для cdn_domain у регистратора"
  value       = yandex_cdn_resource.public.provider_cname
}

output "cdn_certificate_dns_records" {
  description = "DNS-записи для выпуска сертификата CDN (Certificate Manager)"
  value       = yandex_cm_certificate.cdn.challenges
}

output "lockbox_secret_id" {
  value = yandex_lockbox_secret.app.id
}

output "app_s3_access_key_id" {
  value     = yandex_iam_service_account_static_access_key.app_s3.access_key
  sensitive = true
}

output "app_s3_secret_key" {
  value     = yandex_iam_service_account_static_access_key.app_s3.secret_key
  sensitive = true
}

output "cr_pull_service_account_id" {
  value = yandex_iam_service_account.cr_pull.id
}

output "deploy_checklist" {
  description = "Краткий чеклист после apply"
  value       = <<-EOT
    1. A-запись ${var.domain} -> ${yandex_compute_instance.app.network_interface[0].nat_ip_address}
    2. CNAME ${var.cdn_domain} -> ${yandex_cdn_resource.public.provider_cname}
    3. DNS для сертификата CDN (см. cdn_certificate_dns_records)
    4. Обновить Lockbox secret ${yandex_lockbox_secret.app.id} реальными секретами
    5. Скопировать deploy/* на ВМ в /opt/zemledel, создать .env
    6. ./deploy/deploy.sh
    Подробнее: deploy/FIRST-DEPLOY.md
  EOT
}
