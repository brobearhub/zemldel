locals {
  document_monitoring_charts = [
    {
      title = "Private document storage usage (bytes)"
      query = "{folderId=\"${var.folder_id}\", service=\"storage\", resource_id=\"${yandex_storage_bucket.passport.bucket}\", name=\"space_usage\", storage_type=\"All\"}"
    },
    {
      title = "Audit storage usage (bytes; limit 1 GiB)"
      query = "{folderId=\"${var.folder_id}\", service=\"storage\", resource_id=\"${yandex_storage_bucket.document_audit.bucket}\", name=\"space_usage\", storage_type=\"All\"}"
    },
    {
      title = "Private document requests by method"
      query = "{folderId=\"${var.folder_id}\", service=\"storage\", resource_id=\"${yandex_storage_bucket.passport.bucket}\", name=\"rps\"}"
    },
    {
      title = "Document encryption operations"
      query = "{folderId=\"${var.folder_id}\", service=\"kms\", key=\"${yandex_kms_symmetric_key.passport.id}\", name=\"key.crypto_operations_rate\"}"
    },
    {
      title = "Audit delivery rate"
      query = "{folderId=\"${var.folder_id}\", service=\"audit-trails\", trail=\"${yandex_audit_trails_trail.private_documents.id}\", name=\"trail.delivered_events_count\"}"
    },
    {
      title = "Audit trail status"
      query = "{folderId=\"${var.folder_id}\", service=\"audit-trails\", trail=\"${yandex_audit_trails_trail.private_documents.id}\", name=\"trail.status\"}"
    },
  ]
}

# The pinned provider uses the Monitoring API. The current user interface is
# Monium. This dashboard does not create alert rules or notification channels.
resource "yandex_monitoring_dashboard" "private_documents" {
  folder_id   = var.folder_id
  name        = "${var.name_prefix}-private-documents"
  title       = "Private documents: storage and audit"
  description = "Operational storage metrics. Backend cleanup is checked separately by private-documents:check-health."

  dynamic "widgets" {
    for_each = local.document_monitoring_charts
    content {
      chart {
        title          = widgets.value.title
        display_legend = true
        queries {
          target {
            query     = widgets.value.query
            text_mode = true
          }
        }
      }
      position {
        x = (widgets.key % 2) * 18
        y = floor(widgets.key / 2) * 6
        w = 18
        h = 6
      }
    }
  }
}
