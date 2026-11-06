terraform {
  required_version = ">= 1.4.4, < 2.0.0"

  required_providers {
    yandex = {
      source  = "yandex-cloud/yandex"
      version = "0.244.0"
    }
  }
}
