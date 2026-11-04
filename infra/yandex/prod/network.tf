locals {
  labels = {
    project     = "zemledel"
    environment = "prod"
    managed_by  = "terraform"
  }
  applications = {
    frontend = { private_ip = "10.42.0.10", port = 3000, hostname = var.domain }
    backend  = { private_ip = "10.42.0.11", port = 3003, hostname = "api.${var.domain}" }
  }
}

resource "yandex_vpc_network" "prod" {
  name   = "${var.name_prefix}-network"
  labels = local.labels
}

resource "yandex_vpc_subnet" "prod" {
  name           = "${var.name_prefix}-subnet"
  zone           = var.zone
  network_id     = yandex_vpc_network.prod.id
  v4_cidr_blocks = ["10.42.0.0/24"]
  labels         = local.labels
}

resource "yandex_vpc_address" "app" {
  for_each = local.applications
  name     = "${var.name_prefix}-${each.key}-ipv4"
  labels   = local.labels
  external_ipv4_address {
    zone_id = var.zone
  }
  deletion_protection = true
}

resource "yandex_vpc_security_group" "web" {
  name       = "${var.name_prefix}-web"
  network_id = yandex_vpc_network.prod.id

  ingress {
    description    = "HTTP and ACME HTTP-01"
    protocol       = "TCP"
    port           = 80
    v4_cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description    = "HTTPS and WebSocket"
    protocol       = "TCP"
    port           = 443
    v4_cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description    = "SSH from trusted admin addresses"
    protocol       = "TCP"
    port           = 22
    v4_cidr_blocks = var.ssh_allowed_cidrs
  }
  egress {
    description    = "External PostgreSQL TLS, S3, registry, Postbox and updates"
    protocol       = "ANY"
    v4_cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "yandex_vpc_security_group" "backend" {
  name       = "${var.name_prefix}-backend-private"
  network_id = yandex_vpc_network.prod.id
  ingress {
    description    = "Frontend server-side API calls"
    protocol       = "TCP"
    port           = 3003
    v4_cidr_blocks = ["${local.applications.frontend.private_ip}/32"]
  }
}
