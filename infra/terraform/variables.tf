variable "aws_region" {
  type        = string
  description = "AWS region for the production stack."
  default     = "ap-south-1"
}

variable "project_name" {
  type    = string
  default = "devmatch"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "github_repository" {
  type        = string
  description = "GitHub repository in owner/name form."
}

variable "github_oidc_provider_arn" {
  type        = string
  description = "GitHub Actions OIDC provider ARN created by bootstrap."
}

variable "terraform_state_bucket" {
  type        = string
  description = "Bucket created by the bootstrap Terraform configuration."
}

variable "instance_type" {
  type    = string
  default = "t3.medium"

  validation {
    condition     = var.instance_type == "t3.medium"
    error_message = "The initial production architecture requires t3.medium."
  }
}

variable "root_volume_size_gb" {
  type    = number
  default = 40

  validation {
    condition     = var.root_volume_size_gb == 40
    error_message = "The initial production architecture requires a 40 GB root volume."
  }
}
