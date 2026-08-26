variable "cloud_id" {
  type        = string
  description = "Yandex Cloud ID"
}

variable "folder_id" {
  type        = string
  description = "Folder ID для prod-ресурсов"
}

variable "zone" {
  type        = string
  description = "Зона для ВМ приложения"
  default     = "ru-central1-a"
}

variable "domain" {
  type        = string
  description = "Основной домен сайта"
  default     = "zemledelpro.ru"
}

variable "cdn_domain" {
  type        = string
  description = "CDN-домен для публичных файлов"
  default     = "cdn.zemledelpro.ru"
}

variable "operator_cidr" {
  type        = string
  description = "CIDR оператора для SSH (например 203.0.113.10/32)"
}

variable "ssh_public_key" {
  type        = string
  description = "Публичный SSH-ключ для пользователя ubuntu на ВМ"
}

variable "postgres_password" {
  type        = string
  description = "Пароль пользователя PostgreSQL zemledel"
  sensitive   = true
}

variable "postgres_disk_gb" {
  type    = number
  default = 20
}

variable "vm_cores" {
  type    = number
  default = 4
}

variable "vm_memory_gb" {
  type    = number
  default = 8
}

variable "vm_disk_gb" {
  type    = number
  default = 30
}

variable "resource_prefix" {
  type    = string
  default = "prod-zemledel"
}
