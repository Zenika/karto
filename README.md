# Network Policy Explorer (WIP)
A simple static analysis tool to explore network policies declared in a Kubernetes cluster and affected pods.
This is Work In Progress and not even ready to try. 

## Prerequisites
The following tools must be available locally:
- [Go](https://golang.org/doc/install)
- [NodeJS](https://nodejs.org/en/download/) 

## Compilation

### Frontend
To run locally: 
```shell script
npm start
```

### Backend
To build the main executable: 
```shell script
go build network-policy-explorer
```

## Test suites

### Backend
To run the entire test suite: 
```shell script
go test ./...
```
