package main

import (
	"karto/analyzer"
	"karto/analyzer/pod"
	"karto/analyzer/traffic"
	"karto/analyzer/traffic/allowedroute"
	"karto/analyzer/traffic/podisolation"
	"karto/analyzer/workload"
	"karto/analyzer/workload/deployment"
	"karto/analyzer/workload/replicaset"
	"karto/analyzer/workload/service"
)

type Container struct {
	AnalysisScheduler analyzer.AnalysisScheduler
}

func dependencyInjection() Container {
	podAnalyzer := pod.NewAnalyzer()
	podIsolationAnalyzer := podisolation.NewAnalyzer()
	allowedRouteAnalyzer := allowedroute.NewAnalyzer()
	trafficAnalyzer := traffic.NewAnalyzer(podIsolationAnalyzer, allowedRouteAnalyzer)
	serviceAnalyzer := service.NewAnalyzer()
	replicaSetAnalyzer := replicaset.NewAnalyzer()
	deploymentAnalyzer := deployment.NewAnalyzer()
	workloadAnalyzer := workload.NewAnalyzer(serviceAnalyzer, replicaSetAnalyzer, deploymentAnalyzer)
	analysisScheduler := analyzer.NewAnalysisScheduler(podAnalyzer, trafficAnalyzer, workloadAnalyzer)
	return Container{
		AnalysisScheduler: analysisScheduler,
	}
}
