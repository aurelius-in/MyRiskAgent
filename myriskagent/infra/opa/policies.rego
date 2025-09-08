package myriskagent.authz

default allow = false

# Example: deny access to PHI fields unless role is permitted
allow {
  input.user.role == "admin"
}

allow {
  input.user.role == "analyst"
  not input.request.resource.contains("/phi/")
}
