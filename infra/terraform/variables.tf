variable "timeweb_token" {
  type        = string
  sensitive   = true
  description = "Timeweb API token. Pass via TF_VAR_timeweb_token, never commit."
}

variable "domain" {
  type    = string
  default = "zemledel.ru"
}

variable "existing_vpc_id" {
  type        = string
  default     = null
  nullable    = true
  description = "null creates the separate prod VPC. An explicit ID reuses an existing VPC without managing it."
}

variable "db_cpu" {
  description = "Filter for an existing PostgreSQL tariff in Moscow, not a custom configuration."
  type        = number
  default     = 2
}

variable "db_ram_mb" {
  description = "Filter for an existing PostgreSQL tariff in Moscow, not a custom configuration."
  type        = number
  default     = 2048
}

variable "db_disk_mb" {
  description = "Filter for an existing PostgreSQL tariff in Moscow, not a custom configuration."
  type        = number
  default     = 30720
}

variable "db_node_count" {
  type        = number
  default     = 3
  description = "Total nodes including primary: 3 means primary + 2 replicas. Capacity is per node."
  validation {
    condition     = contains([1, 3, 5], var.db_node_count)
    error_message = "Timeweb supports 1, 3 or 5 total nodes (0, 2 or 4 replicas)."
  }
}

variable "db_public_access" {
  type        = bool
  default     = true
  description = "Create and bind a separately billed public IPv4, then enable TLS. Disable only after checking connectivity."
}

variable "backup_start_date" {
  type        = string
  description = "First backup date, YYYY-MM-DD. Set to deployment day; stored without time by API."
  validation {
    condition     = can(formatdate("YYYY-MM-DD", "${var.backup_start_date}T00:00:00Z"))
    error_message = "Use a valid YYYY-MM-DD date."
  }
}

variable "backup_copy_count" {
  type    = number
  default = 1
  validation {
    condition     = var.backup_copy_count >= 1 && var.backup_copy_count <= 99 && floor(var.backup_copy_count) == var.backup_copy_count
    error_message = "Backup copy count must be an integer from 1 to 99."
  }
}

variable "s3_preset_id" {
  type        = number
  default     = 5137
  description = "Standard 10 GB, ru-1. Catalog 2026-11-03; actual availability is confirmed on creation. Per bucket."
}

variable "cdn_preset_id" {
  type        = number
  default     = 5211
  description = "CDN tariff verified 2026-11-03; check current pricing before apply."
}

variable "cdn_traffic_limit_gb" {
  type        = number
  default     = 250
  description = "CDN stops delivery at this monthly traffic limit. Increase deliberately."
}

variable "enable_cdn_tls" {
  type        = bool
  default     = false
  description = "Enable on a second apply, after public DNS for cdn resolves to the CDN CNAME target."
}

variable "dns_records" {
  type = map(object({
    name  = string
    type  = string
    value = string
  }))
  default     = {}
  description = "AppPlatform A/CNAME and mail TXT/MX records, copied from the chosen services. CDN is managed separately."
  validation {
    condition = alltrue([for record in values(var.dns_records) :
      contains(["A", "AAAA", "CNAME", "MX", "TXT"], record.type) && record.name != "cdn"
    ])
    error_message = "Use A/AAAA/CNAME/MX/TXT; cdn is reserved for the managed CDN record."
  }
}
