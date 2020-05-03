# Network Policy Explorer (WIP)
A simple static analysis tool to explore network policies declared in a Kubernetes cluster and affected pods.
This is Work In Progress and not even ready to try. 

## Prerequisites
The following tools must be available locally:
- [Go](https://golang.org/doc/install)
- [NodeJS](https://nodejs.org/en/download/) 

## Compilation

### Frontend
To run in development mode: 
```shell script
npm start
```
This will expose the app in dev mode on port `localhost:3000` with a proxy to `localhost:8000` for the API calls.

To compile: 
```shell script
npm run build
```
This will generate a `build` folder in `/front` that can be served statically.

### Backend
To build the main executable: 
```shell script
go build network-policy-explorer
```
This executable runs on port 8080 and serves the content of `./front/build` on the `/` route and the API on the `/api`
route. If you choose not to run the frontend in development mode, remember to always refresh the frontend content (if 
modified) using the npm `build` command described above.  

## Test suites

### Backend
To run the entire test suite: 
```shell script
go test ./...
```
