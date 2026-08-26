resource "yandex_kms_symmetric_key" "lockbox" {
  name              = "${var.resource_prefix}-lockbox-key"
  default_algorithm = "AES_256"
  rotation_period   = "8760h"
}

resource "yandex_lockbox_secret" "app" {
  name       = "${var.resource_prefix}-app-env"
  kms_key_id = yandex_kms_symmetric_key.lockbox.id

  description = "Prod env для docker compose на ВМ. Значения добавьте версией через yc lockbox secret add-version после apply."
}

# Пустая версия-заглушка: ключи перечислены для документации; значения замените вручную.
resource "yandex_lockbox_secret_version" "app_placeholder" {
  secret_id = yandex_lockbox_secret.app.id

  entries {
    key        = "DATABASE_URL"
    text_value = "REPLACE_AFTER_APPLY"
  }

  entries {
    key        = "INTERNAL_API_SECRET"
    text_value = "REPLACE_AFTER_APPLY"
  }

  entries {
    key        = "SOCKET_JWT_SECRET"
    text_value = "REPLACE_AFTER_APPLY"
  }

  entries {
    key        = "NEXTAUTH_SECRET"
    text_value = "REPLACE_AFTER_APPLY"
  }

  entries {
    key        = "DOCUMENTS_MASTER_KEY_BASE64"
    text_value = "REPLACE_AFTER_APPLY"
  }

  entries {
    key        = "YA_S3_KEY"
    text_value = yandex_iam_service_account_static_access_key.app_s3.access_key
  }

  entries {
    key        = "YA_S3_SECRET"
    text_value = yandex_iam_service_account_static_access_key.app_s3.secret_key
  }

  entries {
    key        = "YA_S3_PRIVATE_BUCKET"
    text_value = yandex_storage_bucket.private.bucket
  }

  entries {
    key        = "YA_S3_PUBLIC_BUCKET"
    text_value = yandex_storage_bucket.public.bucket
  }

  lifecycle {
    ignore_changes = [
      entries,
    ]
  }
}
