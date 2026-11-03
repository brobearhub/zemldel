resource "random_password" "database" {
  length  = 30
  special = false
}

# These values select an existing tariff; they do not configure custom hardware.
data "twc_database_preset" "prod" {
  location = "ru-3"
  type     = "postgres"
  cpu      = var.db_cpu
  ram      = var.db_ram_mb
  disk     = var.db_disk_mb
}

# A NEW cluster; existing cluster 4227573 remains unmanaged.
# Public IP and TLS are configured after creation, in that order.
resource "twc_database_cluster" "prod" {
  name              = "zemledel-prod-tf"
  type              = "postgres18"
  availability_zone = "msk-1"
  preset_id         = tonumber(data.twc_database_preset.prod.id)
  replications      = var.db_node_count

  network {
    id = local.vpc_id
  }

  lifecycle {
    prevent_destroy = true
  }
}

# A separate public IPv4 is billable; it must be bound before enabling TLS.
resource "twc_floating_ip" "database" {
  count             = var.db_public_access ? 1 : 0
  availability_zone = "msk-1"
  comment           = "Public IPv4 for zemledel-prod-tf"

  resource {
    type = "dbaas"
    id   = twc_database_cluster.prod.id
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "terraform_data" "database_public_ready" {
  count            = var.db_public_access ? 1 : 0
  triggers_replace = [twc_database_cluster.prod.id, twc_floating_ip.database[0].id]
  provisioner "local-exec" {
    command = "python3 \"${path.module}/scripts/wait-database-public.py\""
    environment = {
      TWC_TOKEN  = var.timeweb_token
      CLUSTER_ID = twc_database_cluster.prod.id
    }
  }
}

# The native provider applies TLS before the public IP can be bound. Apply it
# separately after public IPv4 is ready, without changing the cluster lifecycle.
resource "restapi_object" "database_tls" {
  count                   = var.db_public_access ? 1 : 0
  depends_on              = [terraform_data.database_public_ready, twc_database_instance.prod]
  path                    = "/api/v1/databases"
  object_id               = twc_database_cluster.prod.id
  id_attribute            = "db/id"
  create_path             = "/api/v1/databases/{id}"
  create_method           = "PATCH"
  destroy_method          = "GET"
  ignore_server_additions = true
  data                    = jsonencode({ is_secure_connection_enable = true })

  lifecycle {
    prevent_destroy = true
  }
}

# A successful PATCH does not necessarily mean TLS was enabled. Check the
# server-reported setting before the overall deployment is considered complete.
resource "terraform_data" "database_tls_ready" {
  count            = var.db_public_access ? 1 : 0
  depends_on       = [restapi_object.database_tls]
  triggers_replace = [twc_database_cluster.prod.id, restapi_object.database_tls[0].id]
  provisioner "local-exec" {
    command = "python3 \"${path.module}/scripts/wait-database-public.py\""
    environment = {
      TWC_TOKEN   = var.timeweb_token
      CLUSTER_ID  = twc_database_cluster.prod.id
      REQUIRE_TLS = "true"
    }
  }
}

resource "twc_database_user" "app" {
  depends_on = [terraform_data.database_public_ready]
  cluster_id = tonumber(twc_database_cluster.prod.id)
  login      = "zemledel_app"
  password   = random_password.database.result
  for_all    = true
  privileges = ["CREATE", "TEMPORARY"]

  lifecycle {
    prevent_destroy = true
  }
}

# Ownership allows Prisma migrations without granting CREATEDB/CREATEROLE.
resource "twc_database_instance" "prod" {
  cluster_id = tonumber(twc_database_cluster.prod.id)
  name       = "zemledel_db_prod"
  owner_id   = tonumber(twc_database_user.app.id)

  lifecycle {
    prevent_destroy = true
  }
}

resource "twc_database_backup_schedule" "prod" {
  depends_on        = [twc_database_instance.prod]
  cluster_id        = tonumber(twc_database_cluster.prod.id)
  enabled           = true
  copy_count        = var.backup_copy_count
  interval          = "day"
  creation_start_at = "${var.backup_start_date}T00:00:00"
}
