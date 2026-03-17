variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "repository" {
  type        = string
  description = "The repository URL (e.g., https://github.com/user/repo)"
}

variable "access_token" {
  type        = string
  description = "GitHub/GitLab Personal Access Token"
  sensitive   = true
}

variable "supabase_url" {
  type = string
}

variable "supabase_anon_key" {
  type      = string
  sensitive = true
}

variable "supabase_project_id" {
  type = string
}
