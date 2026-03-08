# Minimalist Helm Chart

A Helm chart for the Minimalist application (React + Nginx).

## Introduction

This chart bootstraps a [Minimalist](https://github.com/lightsspeed/minimalist) deployment on a [Kubernetes](http://kubernetes.io) cluster using the [Helm](https://helm.sh) package manager.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+

## Installing the Chart

To install the chart with the release name `minimalist`:

```console
$ helm install minimalist ./charts/minimalist
```

The command deploys Minimalist on the Kubernetes cluster in the default configuration. The [Parameters](#parameters) section lists the parameters that can be configured during installation.

## Uninstalling the Chart

To uninstall/delete the `minimalist` deployment:

```console
$ helm uninstall minimalist
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Parameters

The following table lists the configurable parameters of the Minimalist chart and their default values.

| Key | Description | Default |
|-----|-------------|---------|
| `replicaCount` | Number of replicas | `3` |
| `image.repository` | Image repository | `670246014226.dkr.ecr.us-east-1.amazonaws.com/minimalist` |
| `image.tag` | Image tag (overrides appVersion) | `""` |
| `service.type` | Service type | `ClusterIP` |
| `service.port` | Service port | `8080` |
| `ingress.enabled` | Enable Ingress | `true` |
| `ingress.className` | Ingress Class Name | `traefik-ingress` |
| `ingress.hosts[0].host` | Ingress Host | `minimalist.local` |
| `resources` | CPU/Memory requests/limits | `Limits: 200m/256Mi, Requests: 100m/128Mi` |
| `autoscaling.enabled` | Enable HPA | `false` |
| `features.supabaseUrl` | Supabase URL | `...` |
| `features.supabaseProjectId` | Supabase Project ID | `...` |

Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`. For example:

```console
$ helm install minimalist ./charts/minimalist --set replicaCount=1
```

Alternatively, a YAML file that specifies the values for the above parameters can be provided while installing the chart. For example:

```console
$ helm install minimalist ./charts/minimalist -f values.yaml
```
