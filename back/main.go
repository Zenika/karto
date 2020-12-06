package main

import (
	"flag"
	"fmt"
	"karto/api"
	"karto/clusterlistener"
	"karto/types"
	"os"
	"path/filepath"
)

const version = "1.4.0"

func main() {
	versionFlag, k8sConfigPath := parseCmd()
	if versionFlag {
		fmt.Printf("Karto v%s\n", version)
		os.Exit(0)
	}
	container := dependencyInjection()
	analysisScheduler := container.AnalysisScheduler
	analysisResultsChannel := make(chan types.AnalysisResult)
	clusterStateChannel := make(chan types.ClusterState)
	go clusterlistener.Listen(k8sConfigPath, clusterStateChannel)
	go analysisScheduler.AnalyzeOnClusterStateChange(clusterStateChannel, analysisResultsChannel)
	api.Expose(":8000", analysisResultsChannel)
}

func parseCmd() (bool, string) {
	versionFlag := flag.Bool("version", false, "prints Karto's current version")
	home := os.Getenv("HOME")
	if home == "" {
		home = os.Getenv("USERPROFILE")
	}
	var k8sConfigPath *string
	if home != "" {
		k8sConfigPath = flag.String("kubeconfig", filepath.Join(home, ".kube", "config"),
			"(optional) absolute path to the kubeconfig file")
	} else {
		k8sConfigPath = flag.String("kubeconfig", "", "absolute path to the kubeconfig file")
	}
	flag.Parse()

	return *versionFlag, *k8sConfigPath
}
