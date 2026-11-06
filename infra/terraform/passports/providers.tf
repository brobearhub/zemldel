# Authentication comes from YC_TOKEN or YC_SERVICE_ACCOUNT_KEY_FILE.
# Never put credentials in .tf files or commit an authorized key.
provider "yandex" {
  cloud_id  = var.cloud_id
  folder_id = var.folder_id
  zone      = "ru-central1-a"
}
