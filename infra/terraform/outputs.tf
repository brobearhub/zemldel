output "vpc_id" {
  value = local.vpc_id
}

output "database_cluster_id" {
  value = twc_database_cluster.prod.id
}

output "database_public_ipv4" {
  value       = try(twc_floating_ip.database[0].ip, null)
  description = "Public IPv4 for the database, billed separately."
}

output "database_credentials" {
  sensitive = true
  value = {
    database = twc_database_instance.prod.name
    user     = twc_database_user.app.login
    password = random_password.database.result
  }
}

output "backend_storage_environment" {
  sensitive = true
  value = {
    S3_ENDPOINT         = "https://${twc_s3_bucket.media["public"].hostname}"
    S3_REGION           = "ru-1"
    S3_KEY              = twc_s3_user.backend.access_key
    S3_SECRET           = twc_s3_user.backend.secret_key
    S3_PUBLIC_BUCKET    = twc_s3_bucket.media["public"].full_name
    S3_PRIVATE_BUCKET   = twc_s3_bucket.media["private"].full_name
    S3_FORCE_PATH_STYLE = "true"
    S3_PUBLIC_PREFIX    = "public/"
    S3_PRIVATE_PREFIX   = "private/"
    CDN_PUBLIC_BASE_URL = "https://cdn.${var.domain}"
  }
}

output "cdn_id" {
  value = restapi_object.cdn.id
}

output "cdn_cname_target" {
  value = jsondecode(restapi_object.cdn.api_response).http_resource.cdn_domain
}

output "application_urls" {
  value = {
    frontend = "https://${var.domain}"
    backend  = "https://api.${var.domain}"
    cdn      = "https://cdn.${var.domain}"
  }
}

output "database_tariff" {
  value = {
    preset_id           = data.twc_database_preset.prod.id
    cpu                 = data.twc_database_preset.prod.cpu
    ram_mb              = data.twc_database_preset.prod.ram
    disk_mb             = data.twc_database_preset.prod.disk
    node_count          = var.db_node_count
    monthly_per_node    = data.twc_database_preset.prod.price
    monthly_nodes_total = data.twc_database_preset.prod.price * var.db_node_count
  }
  description = "Catalog pricing for DB nodes only, excluding backups and other services."
}

output "database_domains" {
  value = twc_database_cluster.prod.domains[*].fqdn
}
