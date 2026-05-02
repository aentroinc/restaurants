variable "project" {
  default = "aentro"
}

variable "env" {
  type = string
}

variable "ecs_cluster_name" {
  type = string
}

locals {
  name = "${var.project}-${var.env}"
}

# --- CloudWatch Dashboard ---
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = local.name

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "ECS CPU Utilization"
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", var.ecs_cluster_name]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "ECS Memory Utilization"
          metrics = [
            ["AWS/ECS", "MemoryUtilization", "ClusterName", var.ecs_cluster_name]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "ALB 5xx Errors"
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count"]
          ]
          period = 60
          stat   = "Sum"
          region = data.aws_region.current.name
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "ALB Response Time"
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime"]
          ]
          period = 60
          stat   = "p95"
          region = data.aws_region.current.name
        }
      }
    ]
  })
}

data "aws_region" "current" {}

# --- Alarms ---
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${local.name}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS CPU utilization > 80% for 15 minutes"

  dimensions = {
    ClusterName = var.ecs_cluster_name
  }

  tags = {
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_cloudwatch_metric_alarm" "high_5xx" {
  alarm_name          = "${local.name}-high-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "More than 10 5xx errors in 2 minutes"

  tags = {
    Environment = var.env
    Project     = var.project
  }
}
