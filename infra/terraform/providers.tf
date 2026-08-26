provider "yandex" {
  cloud_id  = var.cloud_id
  folder_id = var.folder_id
  zone      = var.zone
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

data "yandex_compute_image" "ubuntu" {
  family = "ubuntu-2404-lts"
}
