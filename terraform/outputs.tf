output "amplify_app_id" {
  value = aws_amplify_app.minimalist.id
}

output "default_domain" {
  value = aws_amplify_app.minimalist.default_domain
}

output "production_branch_url" {
  value = "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.minimalist.default_domain}"
}

output "certificate_verification_dn_record" {
  value = aws_amplify_domain_association.deployone.certificate_verification_dns_record
}

output "subdomain_dns_records" {
  value = {
    for sd in aws_amplify_domain_association.deployone.sub_domain : sd.prefix => sd.dns_record
  }
}
