resource "aws_security_group" "app" {
  name        = "${var.project_name}-${var.environment}-app"
  description = "Public HTTPS edge only; administration uses SSM"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP for ACME redirect"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS API and WebSocket"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-${var.environment}-app" }
}
