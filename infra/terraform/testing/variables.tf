variable "timeweb_token" {
  type        = string
  sensitive   = true
  description = "Timeweb API token. Pass via TF_VAR_timeweb_token, never commit."
}

variable "db_cpu" {
  description = "Filter for an existing PostgreSQL tariff in Moscow, not a custom configuration."
  type        = number
  default     = 1
}

variable "db_ram_mb" {
  description = "Filter for an existing PostgreSQL tariff in Moscow, not a custom configuration."
  type        = number
  default     = 2048
}

variable "db_disk_mb" {
  description = "Filter for an existing PostgreSQL tariff in Moscow, not a custom configuration."
  type        = number
  default     = 20480
}

variable "db_public_access" {
  type        = bool
  default     = true
  description = "Needed for local migrations and possibly AppPlatform build. Disable only after checking connectivity."
}

variable "s3_preset_id" {
  type        = number
  default     = 5127
  description = "Premium hot 1 GB promo, ru-1. Verified 2026-11-03. Per bucket; eligibility confirmed at creation."
}
