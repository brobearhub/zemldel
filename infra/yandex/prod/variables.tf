variable "cloud_id" {
  type        = string
  description = "Existing cloud ID; this configuration does not create a billing account."
}

variable "folder_id" {
  type        = string
  description = "Existing folder for the new production resources."
}

variable "zone" {
  type    = string
  default = "ru-central1-a"
}

variable "domain" {
  type    = string
  default = "zemledelpro.ru"
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9.-]+[a-z0-9]$", var.domain))
    error_message = "Use a domain name without protocol or trailing dot."
  }
}

variable "name_prefix" {
  type    = string
  default = "zemledel-prod"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,29}$", var.name_prefix))
    error_message = "Use 2-30 lowercase letters, digits or hyphens; start with a letter."
  }
}

variable "ssh_public_key_path" {
  type    = string
  default = "~/.ssh/id_ed25519.pub"
}

variable "ssh_allowed_cidrs" {
  type        = list(string)
  default     = []
  description = "Your external IPv4 /32 or trusted admin networks. Public SSH is not allowed."
  validation {
    condition = length(var.ssh_allowed_cidrs) > 0 && alltrue([
      for cidr in var.ssh_allowed_cidrs :
      can(cidrnetmask(cidr)) && !contains(["0.0.0.0/0", "0.0.0.0/1", "128.0.0.0/1"], cidr)
    ])
    error_message = "Set at least one trusted IPv4 CIDR, for example your public IP with /32."
  }
}

variable "acme_email" {
  type        = string
  default     = "support@zemledelpro.ru"
  description = "Address for Caddy certificate notifications."
  validation {
    condition     = can(regex("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$", var.acme_email))
    error_message = "Provide an email address."
  }
}

variable "vm_cores" {
  type    = number
  default = 2
}

variable "vm_memory_gb" {
  type    = number
  default = 4
}

variable "vm_core_fraction" {
  type    = number
  default = 100
  validation {
    condition     = contains([20, 50, 100], var.vm_core_fraction)
    error_message = "standard-v3 supports core fractions 20, 50 and 100."
  }
}

variable "vm_disk_gb" {
  type    = number
  default = 20
  validation {
    condition     = var.vm_disk_gb >= 20 && floor(var.vm_disk_gb) == var.vm_disk_gb
    error_message = "Use an integer disk size of at least 20 GB; build images outside the VMs."
  }
}

variable "bucket_max_size_gb" {
  type        = number
  default     = 10
  description = "Size limit per bucket; charged for actual data, not this capacity."
}

variable "publish_application_dns" {
  type        = bool
  default     = false
  description = "Set true only after both applications are deployed and tested on the new VMs."
}

variable "enable_cdn_tls" {
  type        = bool
  default     = false
  description = "Second stage: enable after DNS delegation; waits for the managed CDN certificate."
}

variable "extra_dns_records" {
  type = map(object({
    name = string
    type = string
    ttl  = optional(number, 600)
    data = list(string)
  }))
  default     = {}
  description = "Copy ALL existing MX/TXT/DKIM/verification records before changing NS. TXT strings need DNS quotes."
  validation {
    condition = alltrue([
      for record in values(var.extra_dns_records) :
      contains(["MX", "TXT", "CAA", "SRV", "CNAME"], record.type) &&
      !contains(["www", "api", "cdn", "_acme-challenge.cdn"], record.name) &&
      !(record.name == "@" && record.type == "CNAME")
    ])
    error_message = "Extra records accept MX/TXT/CAA/SRV/CNAME; reserved app/CDN names cannot be overridden."
  }
}
