# Network Policy Explorer (WIP)

A simple static analysis tool to explore network policies declared in a Kubernetes cluster and affected pods.

This is Work In Progress and not even ready to try. 

## Prerequisites

Follow the instructions on the [Go website](https://golang.org/doc/install) to install the `go` executable.

## Compilation

The following command will build the main executable: 
```shell script
go build network-policy-explorer
```

## Tests

The following command will run the entire test suite: 
```shell script
go test ./...
```
