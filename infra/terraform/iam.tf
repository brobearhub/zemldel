resource "yandex_iam_service_account" "app" {
  name        = "${var.resource_prefix}-app"
  description = "Backend: Object Storage и чтение Lockbox"
}

resource "yandex_iam_service_account" "cr_pull" {
  name        = "${var.resource_prefix}-cr-pull"
  description = "Pull образов из Container Registry на ВМ"
}

resource "yandex_resourcemanager_folder_iam_member" "app_storage_editor" {
  folder_id = var.folder_id
  role      = "storage.editor"
  member    = "serviceAccount:${yandex_iam_service_account.app.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "app_lockbox_viewer" {
  folder_id = var.folder_id
  role      = "lockbox.payloadViewer"
  member    = "serviceAccount:${yandex_iam_service_account.app.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "cr_pull" {
  folder_id = var.folder_id
  role      = "container-registry.images.puller"
  member    = "serviceAccount:${yandex_iam_service_account.cr_pull.id}"
}

resource "yandex_iam_service_account_static_access_key" "app_s3" {
  service_account_id = yandex_iam_service_account.app.id
  description        = "Static key for YA_S3_KEY / YA_S3_SECRET in Lockbox"
}

resource "yandex_iam_service_account_key" "cr_pull_key" {
  service_account_id = yandex_iam_service_account.cr_pull.id
  description        = "JSON key for docker login on VM (положить в Lockbox / deploy env)"
  key_algorithm      = "RSA_2048"
}
