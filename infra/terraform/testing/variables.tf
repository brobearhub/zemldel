variable "timeweb_token" {
  type        = string
  sensitive   = true
  description = "Timeweb API token. Pass via TF_VAR_timeweb_token, never commit."
}

variable "s3_public_preset_id" {
  type        = number
  default     = 5135
  description = "Standard 1 GB promo for public images, ru-1. Verify price at plan time."
}
