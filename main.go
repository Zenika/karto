package main

import (
	"flag"
	"fmt"
	"karto/analyzer"
	"karto/api"
	"karto/types"
	"os"
	"path/filepath"
)

var version = "1.2.0"

func main() {
	versionFlag, k8sConfigPath := parseCmd()
	if versionFlag {
		fmt.Printf("Karto v%s\n", version)
		os.Exit(0)
	}
	analysisResultsChannel := make(chan types.AnalysisResult)
	go analyzer.AnalyzeOnChange(k8sConfigPath, analysisResultsChannel)
	api.Expose(analysisResultsChannel)
}

func parseCmd() (bool, string) {
	versionFlag := flag.Bool("version", false, "prints Karto's current version")
	home := os.Getenv("HOME")
	if home == "" {
		home = os.Getenv("USERPROFILE")
	}
	var k8sConfigPath *string
	if home != "" {
		k8sConfigPath = flag.String("kubeconfig", filepath.Join(home, ".kube", "config"), "(optional) absolute path to the kubeconfig file")
	} else {
		k8sConfigPath = flag.String("kubeconfig", "", "absolute path to the kubeconfig file")
	}
	flag.Parse()

	return *versionFlag, *k8sConfigPath
}
