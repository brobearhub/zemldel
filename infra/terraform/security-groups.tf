resource "yandex_vpc_security_group" "vm" {
  name       = "${var.resource_prefix}-sg-vm"
  network_id = yandex_vpc_network.main.id

  ingress {
    description    = "HTTP"
    protocol       = "TCP"
    port           = 80
    v4_cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description    = "HTTPS"
    protocol       = "TCP"
    port           = 443
    v4_cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description    = "SSH operator"
    protocol       = "TCP"
    port           = 22
    v4_cidr_blocks = [var.operator_cidr]
  }

  egress {
    description    = "Any"
    protocol       = "ANY"
    v4_cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "yandex_vpc_security_group" "postgres" {
  name       = "${var.resource_prefix}-sg-postgres"
  network_id = yandex_vpc_network.main.id

  ingress {
    description       = "PostgreSQL from app VM"
    protocol          = "TCP"
    port              = 6432
    security_group_id = yandex_vpc_security_group.vm.id
  }

  ingress {
    description    = "PostgreSQL from operator (restore cities dump)"
    protocol       = "TCP"
    port           = 6432
    v4_cidr_blocks = [var.operator_cidr]
  }

  egress {
    description    = "Any"
    protocol       = "ANY"
    v4_cidr_blocks = ["0.0.0.0/0"]
  }
}
