resource "yandex_mdb_postgresql_cluster" "main" {
  name        = "${var.resource_prefix}-pg"
  environment = "PRODUCTION"
  network_id  = yandex_vpc_network.main.id

  config {
    version = 16
    resources {
      resource_preset_id = "s3-c2-m8"
      disk_type_id       = "network-ssd"
      disk_size          = var.postgres_disk_gb
    }

    backup_window_start {
      hours   = 2
      minutes = 0
    }
  }

  host {
    zone             = "ru-central1-a"
    subnet_id        = yandex_vpc_subnet.a.id
    assign_public_ip = true
  }

  host {
    zone             = "ru-central1-b"
    subnet_id        = yandex_vpc_subnet.b.id
    assign_public_ip = true
  }

  security_group_ids = [yandex_vpc_security_group.postgres.id]

  database {
    name  = "zemledel"
    owner = "zemledel"
  }

  user {
    name     = "zemledel"
    password = var.postgres_password

    permission {
      database_name = "zemledel"
    }
  }

  deletion_protection = true
}

locals {
  pg_cluster_id = yandex_mdb_postgresql_cluster.main.id
  pg_rw_fqdn    = "c-${local.pg_cluster_id}.rw.mdb.yandexcloud.net"
  pg_database_url = format(
    "postgres://zemledel:%s@%s:6432/zemledel?sslmode=verify-full&target_session_attrs=read-write",
    urlencode(var.postgres_password),
    local.pg_rw_fqdn,
  )
}
