package main

import (
	"flag"
	"network-policy-explorer/api"
	"network-policy-explorer/trafficanalyzer"
	"network-policy-explorer/types"
	"os"
	"path/filepath"
)

func main() {
	k8sConfigPath := parseCmd()
	analysisResultsChannel := make(chan types.AnalysisResult)
	go trafficanalyzer.AnalyzeEverySeconds(k8sConfigPath, analysisResultsChannel, 10)
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
