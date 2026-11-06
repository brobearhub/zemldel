variable "cloud_id" {
  type        = string
  description = "Cloud containing the dedicated personal-data folder."
}

variable "folder_id" {
  type        = string
  description = "Existing dedicated folder in the Russian cloud. No folder-wide runtime roles are created."
}

variable "name_prefix" {
  type        = string
  description = "Globally unique bucket prefix, without personal data. Use a separate prefix and state per environment."
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,29}[a-z0-9]$", var.name_prefix))
    error_message = "Use 4–31 lowercase letters, digits or hyphens; start with a letter and end with a letter or digit."
  }
}

variable "bucket_max_size_bytes" {
  type        = number
  default     = 10737418240
  description = "Capacity limit per bucket (default 10 GiB); not a per-upload size limit."
  validation {
    condition     = var.bucket_max_size_bytes >= 1073741824 && floor(var.bucket_max_size_bytes) == var.bucket_max_size_bytes
    error_message = "Specify an integer capacity of at least 1 GiB."
  }
}

variable "noncurrent_retention_days" {
  type        = number
  default     = 7
  description = "Fallback cleanup for historical versions from before suspension. Explicit erasure must purge all versions immediately."
  validation {
    condition     = var.noncurrent_retention_days >= 1 && var.noncurrent_retention_days <= 30 && floor(var.noncurrent_retention_days) == var.noncurrent_retention_days
    error_message = "Use an integer recovery window of 1–30 days."
  }
}

variable "terraform_service_account_id" {
  type        = string
  description = "Existing provisioning identity. Bucket policy must explicitly permit its management operations."
  validation {
    condition     = can(regex("^[a-z0-9]{20}$", var.terraform_service_account_id))
    error_message = "Use the 20-character ID of the existing Terraform service account."
  }
}

variable "audit_retention_days" {
  type        = number
  default     = 30
  description = "Operational audit retention, not a legal compliance assertion. Current data is stored separately."
  validation {
    condition     = var.audit_retention_days >= 7 && var.audit_retention_days <= 365 && floor(var.audit_retention_days) == var.audit_retention_days
    error_message = "Use an integer retention period of 7–365 days."
  }
}
