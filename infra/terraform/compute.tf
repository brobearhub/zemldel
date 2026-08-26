resource "yandex_compute_instance" "app" {
  name        = "${var.resource_prefix}-app"
  platform_id = "standard-v3"
  zone        = var.zone

  resources {
    cores         = var.vm_cores
    memory        = var.vm_memory_gb
    core_fraction = 100
  }

  boot_disk {
    initialize_params {
      image_id = data.yandex_compute_image.ubuntu.id
      size     = var.vm_disk_gb
      type     = "network-ssd"
    }
  }

  network_interface {
    subnet_id          = yandex_vpc_subnet.a.id
    nat                = true
    security_group_ids = [yandex_vpc_security_group.vm.id]
  }

  metadata = {
    ssh-keys  = "ubuntu:${var.ssh_public_key}"
    user-data = file("${path.module}/cloud-init.yaml")
  }

  scheduling_policy {
    preemptible = false
  }
}
