# LightsSpeed Monitoring Stack

A complete observability solution for the LightsSpeed application using Prometheus, Grafana, and Loki.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Monitoring Stack                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐        │
│  │   Grafana     │◄───│  Prometheus   │◄───│ Node Exporter │        │
│  │  (Dashboards) │    │   (Metrics)   │    │ (Host Metrics)│        │
│  └───────┬───────┘    └───────┬───────┘    └───────────────┘        │
│          │                    │                                      │
│          │            ┌───────┴───────┐    ┌───────────────┐        │
│          │            │    Kube-State │    │   cAdvisor    │        │
│          │            │    Metrics    │    │(Container Met)│        │
│          │            └───────────────┘    └───────────────┘        │
│          │                                                           │
│          │            ┌───────────────┐                              │
│          └───────────►│     Loki      │◄─────────┐                  │
│                       │    (Logs)     │          │                  │
│                       └───────────────┘    ┌─────┴─────┐            │
│                                            │ Promtail  │            │
│                                            │(Log Ship) │            │
│                                            └───────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

## Components

### Prometheus (Metrics Collection)
- **prometheus/**: Core metrics server with 30-day retention
- **node-exporter/**: Host-level metrics (CPU, memory, disk, network)
- **kube-state-metrics/**: Kubernetes object metrics (pods, deployments, services)

### Grafana (Visualization)
- Pre-configured datasources for Prometheus and Loki
- Three custom dashboards:
  - **Business Metrics**: Users, tasks, notes, share access
  - **Kubernetes Infrastructure**: Nodes, pods, resource usage
  - **Logs**: Application and system logs with filtering

### Loki + Promtail (Log Aggregation)
- **loki/**: Log storage and query engine
- **promtail/**: Log collection agent (runs on all nodes)

## Quick Start

```bash
# Deploy the entire stack
chmod +x k8s/monitoring/deploy.sh
./k8s/monitoring/deploy.sh

# Or deploy manually
kubectl apply -f k8s/monitoring/namespace.yaml
kubectl apply -f k8s/monitoring/prometheus/
kubectl apply -f k8s/monitoring/loki/
kubectl apply -f k8s/monitoring/promtail/
kubectl apply -f k8s/monitoring/grafana/
```

## Access

### Port Forwarding (Development)
```bash
# Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000

# Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090
```

### Default Credentials
- **Grafana**: admin / LightsSpeed2024! (CHANGE IN PRODUCTION!)

## Metrics Collected

### Application Metrics (from Edge Function)
| Metric | Type | Description |
|--------|------|-------------|
| `users_total` | Gauge | Total registered users |
| `active_users_today_total` | Gauge | Users active in last 24h |
| `tasks_created_today_total` | Gauge | Tasks created today |
| `tasks_completed_today_total` | Gauge | Tasks completed today |
| `notes_created_today_total` | Gauge | Notes created today |
| `db_table_rows_total` | Gauge | Row count per table |
| `tasks_by_status` | Gauge | Tasks by completion status |
| `subtasks_by_status` | Gauge | Subtasks by completion status |
| `share_access_attempts_total` | Counter | Share access attempts |
| `metrics_scrape_duration_seconds` | Gauge | Metrics collection time |

### Node Metrics
| Metric | Description |
|--------|-------------|
| `node_cpu_seconds_total` | CPU usage per mode |
| `node_memory_*` | Memory usage stats |
| `node_filesystem_*` | Disk usage stats |
| `node_network_*` | Network I/O stats |

### Pod Metrics
| Metric | Description |
|--------|-------------|
| `container_cpu_usage_seconds_total` | Container CPU usage |
| `container_memory_usage_bytes` | Container memory usage |
| `container_network_*` | Container network I/O |
| `kube_pod_status_*` | Pod status information |

## Alerting Rules

Pre-configured alerts include:
- High error rate on share access
- Pod not ready for 5+ minutes
- High CPU/memory usage (>90%)
- Node disk pressure
- Database latency issues
- Node down

## Dashboards

### Business Metrics Dashboard
![Business Metrics](docs/business-metrics.png)
- User activity overview
- Task/note creation trends
- Share access statistics
- Database growth

### Kubernetes Infrastructure Dashboard
![Infrastructure](docs/infrastructure.png)
- Cluster health overview
- Node resource utilization
- Pod status and restarts
- Network I/O

### Logs Dashboard
![Logs](docs/logs.png)
- Real-time log streaming
- Error log filtering
- Log volume by pod
- System logs

## Storage

| Component | Default Size | Retention |
|-----------|--------------|-----------|
| Prometheus | 20Gi | 30 days |
| Loki | 20Gi | 30 days |
| Grafana | 5Gi | N/A |

## Customization

### Adding Custom Metrics
Add annotations to your pods:
```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
    prometheus.io/path: "/metrics"
```

### Adding Custom Dashboards
1. Create JSON dashboard in `grafana/dashboards/`
2. Update `dashboards-configmap.yaml`
3. Redeploy Grafana

### Modifying Retention
Edit `prometheus/deployment.yaml`:
```yaml
args:
  - '--storage.tsdb.retention.time=30d'
  - '--storage.tsdb.retention.size=10GB'
```

## Troubleshooting

### Check component status
```bash
kubectl get pods -n monitoring
kubectl get pvc -n monitoring
```

### View logs
```bash
kubectl logs -n monitoring -l app=prometheus
kubectl logs -n monitoring -l app=grafana
kubectl logs -n monitoring -l app=loki
kubectl logs -n monitoring -l app=promtail
```

### Common issues
1. **PVC pending**: Check storage class availability
2. **Prometheus can't scrape**: Verify RBAC permissions
3. **Grafana datasource error**: Check service connectivity
4. **Loki not receiving logs**: Verify Promtail configuration

## Security Considerations

1. **Change default passwords** before production deployment
2. Enable **TLS** for ingress (cert-manager configured)
3. Restrict **network policies** for monitoring namespace
4. Use **RBAC** to limit dashboard access
5. Consider **read-only** Grafana for most users
