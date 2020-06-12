![demo](docs/assets/karto-logo.png)

# Karto

A simple static analysis tool to explore and diagnosticate network policies declared in a Kubernetes cluster.

![demo](docs/assets/demo.gif)

## Main features

The left part of the screen contains the controls for the main view:
- Filters: filter pods by namespace, labels and name
- Include ingress neighbors: display pods that can reach those in the current selection 
- Include egress neighbors: display pods that can be reached by those in the current selection
- Auto refresh: refresh the view every 5 seconds
- Show namespace prefix: include the namespace in pod names
- Highlight non isolated pods (ingress/egress): color pods with no ingress/egress network policy
- Always display large datasets: always try to display large sets of pods and routes (may slow down your browser)

The main view shows the graph of pods and allowed routes in your selection:
- Zoom in and out by scrolling
- Drag and drop pods to draw the perfect map of your cluster

Hover over a pod to display details:
- Name, namespace and labels
- Isolation (ingress/egress)

Hover over a route to investigate allowed traffic:
- Source/target pod
- Ports
- Explanation (lack of isolation or network policies allowing traffic)

## Installation

There are two ways to install and run Karto:
- To deploy it inside the Kubernetes cluster to analyze, proceed to the 
[Run inside a cluster](#run-inside-a-cluster) section.
- To run it on any machine outside the Kubernetes cluster to analyze, refer to the 
[Run outside a cluster](#run-outside-a-cluster) section.

### Run inside a cluster

#### Deployment

Simply apply the provided descriptor:
```shell script
kubectl apply -f deploy/k8s.yml
```
This will:
- create a `karto` namespace
- create a `karto` service account with a role allowing to list all pods, namespaces and network 
policies in the cluster
- deploy an instance of the application in this namespace with this service account

#### Exposition

Once deployed, the application must be exposed. For a quick try, use `port-forward`:
```shell script
kubectl -n karto port-forward <pod name> 8000:8000
```
The will exposed the app on your local machine on `localhost:8000`.

For a long-term solution, investigate the use of a [LoadBalancer service](
https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services-service-types) or an [Ingress](
https://kubernetes.io/docs/concepts/services-networking/ingress/).

*Remember to always secure the access to the application as it obviously displays sensitive data about your cluster.* 

#### Cleanup

Delete everything using the same descriptor:
```shell script
kubectl delete -f deploy/k8s.yml
```

### Run outside a cluster

For this to work, a local `kubeconfig` file with existing connection information to the target cluster must be present
on the machine (if you already use `kubectl` locally, you are good to go!). 

Simply download the Karto binary from the [releases page](https://github.com/Zenika/karto/releases) and run it!

## Development

### Prerequisites

The following tools must be available locally:
- [Go](https://golang.org/doc/install) (tested with Go 1.14)
- [NodeJS 10+](https://nodejs.org/en/download/) (tested with NodeJS 10)

### Run the frontend in dev mode:

In the `front` folder, execute:
```shell script
npm start
```
This will expose the app in dev mode on `localhost:3000` with a proxy to `localhost:8000` for the API calls.

### Run the backend locally:

Simply execute: 
```shell script
go build karto
./karto
```

### Test suites

To run the entire backend test suite: 
```shell script
go test ./...
```

### Compile the go binary from source

In production mode, the frontend is packaged in the go binary using [pkger](https://github.com/markbates/pkger). In this
configuration, the frontend is served on the `/` route and the API on the `/api` route.

To compile the Karto binary from source, first compile the frontend source code. In the `front` folder, execute:
```shell script
npm run build
```
This will generate a `build` folder in `/front`.

Then, package it inside the backend:
```shell script
go install github.com/markbates/pkger/cmd/pkger
pkger
```
This will generate a `pkged.go` file at the root with a binary content equivalent to the generated `build` folder.

Finally, compile the go binary:
```shell script
go build karto
```
