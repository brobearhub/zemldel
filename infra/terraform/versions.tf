terraform {
  required_version = ">= 1.4.4, < 2.0.0"
  required_providers {
    twc = {
      source  = "tf.timeweb.cloud/timeweb-cloud/timeweb-cloud"
      version = "1.8.4"
    }
    restapi = {
      source  = "Mastercard/restapi"
      version = "3.0.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.7.2"
    }
  }
}
