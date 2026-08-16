output "instance_id" { value = aws_instance.app.id }
output "elastic_ip" { value = aws_eip.app.public_ip }
output "release_bucket" { value = aws_s3_bucket.releases.bucket }
output "ecr_registry" { value = split("/", values(aws_ecr_repository.images)[0].repository_url)[0] }
output "ecr_repositories" { value = { for name, repository in aws_ecr_repository.images : name => repository.repository_url } }
output "github_deploy_role_arn" { value = aws_iam_role.github_deploy.arn }
