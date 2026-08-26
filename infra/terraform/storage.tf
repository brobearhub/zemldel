resource "yandex_storage_bucket" "public" {
  bucket = "${var.resource_prefix}-public-${random_id.bucket_suffix.hex}"

  anonymous_access_flags {
    read = true
    list = false
  }

  versioning {
    enabled = false
  }
}

resource "yandex_storage_bucket" "private" {
  bucket = "${var.resource_prefix}-private-${random_id.bucket_suffix.hex}"

  versioning {
    enabled = true
  }
}
