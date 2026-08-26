resource "yandex_vpc_network" "main" {
  name        = "${var.resource_prefix}-vpc"
  description = "VPC prod Zemledel"
}

resource "yandex_vpc_subnet" "a" {
  name           = "${var.resource_prefix}-subnet-a"
  zone           = "ru-central1-a"
  network_id     = yandex_vpc_network.main.id
  v4_cidr_blocks = ["10.10.1.0/24"]
}

resource "yandex_vpc_subnet" "b" {
  name           = "${var.resource_prefix}-subnet-b"
  zone           = "ru-central1-b"
  network_id     = yandex_vpc_network.main.id
  v4_cidr_blocks = ["10.10.2.0/24"]
}
