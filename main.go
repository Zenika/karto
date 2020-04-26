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
	kubernetesConfigPath := parseCmd()
	analysisResultsChannel := make(chan types.AnalysisResult)
	go trafficanalyzer.AnalyzeEverySeconds(kubernetesConfigPath, analysisResultsChannel, 5)
	api.Expose(analysisResultsChannel)
}

func parseCmd() string {
	home := os.Getenv("HOME")
	if home == "" {
		home = os.Getenv("USERPROFILE")
	}
	var kubernetesConfigPath *string
	if home != "" {
		kubernetesConfigPath = flag.String("kubeconfig", filepath.Join(home, ".kube", "config"), "(optional) absolute path to the kubeconfig file")
	} else {
		kubernetesConfigPath = flag.String("kubeconfig", "", "absolute path to the kubeconfig file")
	}
	flag.Parse()

	return *kubernetesConfigPath
}
