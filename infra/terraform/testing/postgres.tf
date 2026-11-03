resource "random_password" "database" {
  length  = 30
  special = false
}

# These values select an existing tariff; they do not configure custom hardware.
data "twc_database_preset" "testing" {
  location = "ru-3"
  type     = "postgres"
  cpu      = var.db_cpu
  ram      = var.db_ram_mb
  disk     = var.db_disk_mb
}

# Separate testing cluster; no production resources are imported.
# The native provider owns provisioning, readiness, TLS and replica updates.
resource "twc_database_cluster" "testing" {
  name                         = "zemledel-testing-tf"
  type                         = "postgres18"
  availability_zone            = "msk-1"
  preset_id                    = tonumber(data.twc_database_preset.testing.id)
  replications                 = 1
  is_external_ip               = var.db_public_access
  is_secure_connection_enabled = true

  network {
    id = twc_vpc.testing.id
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "twc_database_user" "app" {
  cluster_id = tonumber(twc_database_cluster.testing.id)
  login      = "zemledel_app"
  password   = random_password.database.result
  for_all    = true
  privileges = ["CREATE", "TEMPORARY"]

  lifecycle {
    prevent_destroy = true
  }
}

# Ownership allows Prisma migrations without granting CREATEDB/CREATEROLE.
resource "twc_database_instance" "testing" {
  cluster_id = tonumber(twc_database_cluster.testing.id)
  name       = "zemledel_db_testing"
  owner_id   = tonumber(twc_database_user.app.id)

  lifecycle {
    prevent_destroy = true
  }
}
