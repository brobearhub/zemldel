data "yandex_compute_image" "ubuntu" {
  family = "ubuntu-2404-lts"
}

resource "yandex_iam_service_account" "vm" {
  name        = "${var.name_prefix}-vm"
  description = "Pull production container images; application secrets are installed separately."
}

resource "yandex_container_registry" "prod" {
  name   = "${var.name_prefix}-images"
  labels = local.labels
  lifecycle {
    prevent_destroy = true
  }
}

resource "yandex_container_registry_iam_binding" "puller" {
  registry_id = yandex_container_registry.prod.id
  role        = "container-registry.images.puller"
  members     = ["serviceAccount:${yandex_iam_service_account.vm.id}"]
}

resource "yandex_compute_instance" "app" {
  for_each           = local.applications
  name               = "${var.name_prefix}-${each.key}"
  platform_id        = "standard-v3"
  zone               = var.zone
  service_account_id = yandex_iam_service_account.vm.id
  labels             = merge(local.labels, { app = each.key })

  resources {
    cores         = var.vm_cores
    memory        = var.vm_memory_gb
    core_fraction = var.vm_core_fraction
  }
  boot_disk {
    initialize_params {
      image_id = data.yandex_compute_image.ubuntu.id
      type     = "network-ssd"
      size     = var.vm_disk_gb
    }
  }
  network_interface {
    subnet_id          = yandex_vpc_subnet.prod.id
    ip_address         = each.value.private_ip
    nat                = true
    nat_ip_address     = yandex_vpc_address.app[each.key].external_ipv4_address[0].address
    security_group_ids = concat([yandex_vpc_security_group.web.id], each.key == "backend" ? [yandex_vpc_security_group.backend.id] : [])
  }
  metadata = {
    ssh-keys = "ubuntu:${trimspace(file(pathexpand(var.ssh_public_key_path)))}"
    user-data = templatefile("${path.module}/templates/cloud-init.yaml.tftpl", {
      ssh_key    = trimspace(file(pathexpand(var.ssh_public_key_path)))
      role       = each.key
      private_ip = each.value.private_ip
      port       = each.value.port
      hostname   = each.value.hostname
      acme_email = var.acme_email
    })
  }
  scheduling_policy {
    preemptible = false
  }
  lifecycle {
    prevent_destroy = true
    # An image-family update must not replace a running production VM.
    ignore_changes = [boot_disk[0].initialize_params[0].image_id]
  }
  depends_on = [yandex_container_registry_iam_binding.puller]
}
