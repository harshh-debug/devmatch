locals {
  image_names = toset([
    "api-gateway",
    "auth",
    "user-service",
    "match-service",
    "chat-service",
    "profile-parser",
    "migrations",
  ])
}

resource "aws_ecr_repository" "images" {
  for_each             = local.image_names
  name                 = "${var.project_name}-${each.key}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

resource "aws_ecr_lifecycle_policy" "images" {
  for_each   = aws_ecr_repository.images
  repository = each.value.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Retain the ten newest release images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
