package main

import (
	"karto/analyzer"
	"karto/analyzer/pod"
	"karto/analyzer/traffic"
	"karto/analyzer/traffic/allowedroute"
	"karto/analyzer/traffic/podisolation"
	"karto/analyzer/workload"
)

type Container struct {
	AnalysisScheduler analyzer.AnalysisScheduler
}

func dependencyInjection() Container {
	podAnalyzer := pod.NewAnalyzer()
	podIsolationAnalyzer := podisolation.NewAnalyzer()
	allowedRouteAnalyzer := allowedroute.NewAnalyzer()
	trafficAnalyzer := traffic.NewAnalyzer(podIsolationAnalyzer, allowedRouteAnalyzer)
	workloadAnalyzer := workload.NewAnalyzer()
	analysisScheduler := analyzer.NewAnalysisScheduler(podAnalyzer, trafficAnalyzer, workloadAnalyzer)
	return Container{
		AnalysisScheduler: analysisScheduler,
	}
}
