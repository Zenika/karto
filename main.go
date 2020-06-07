package main

import (
	"flag"
	"karto/api"
	"karto/trafficanalyzer"
	"karto/types"
	"os"
	"path/filepath"
)

func main() {
	k8sConfigPath := parseCmd()
	analysisResultsChannel := make(chan types.AnalysisResult)
	go trafficanalyzer.AnalyzeOnChange(k8sConfigPath, analysisResultsChannel)
	api.Expose(analysisResultsChannel)
}

func parseCmd() string {
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

	return *k8sConfigPath
}
