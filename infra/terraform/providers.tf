provider "twc" {
  token = var.timeweb_token
}

# REST is reserved for CDN; the alias below attaches an existing domain to DNS hosting.
provider "restapi" {
  uri                   = "https://api.timeweb.cloud"
  bearer_token          = var.timeweb_token
  create_returns_object = true
  update_method         = "PATCH"
  timeout               = 120
}

# add-domain returns no object; its identifier is the domain name itself.
provider "restapi" {
  alias        = "domain"
  uri          = "https://api.timeweb.cloud"
  bearer_token = var.timeweb_token
  timeout      = 120
}
