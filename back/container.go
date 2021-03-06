package main

import (
	"karto/analyzer"
	"karto/analyzer/pod"
	"karto/analyzer/traffic"
	"karto/analyzer/traffic/allowedroute"
	"karto/analyzer/traffic/podisolation"
	"karto/analyzer/workload"
	"karto/analyzer/workload/daemonset"
	"karto/analyzer/workload/deployment"
	"karto/analyzer/workload/ingress"
	"karto/analyzer/workload/replicaset"
	"karto/analyzer/workload/service"
	"karto/analyzer/workload/statefulset"
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
	ingressAnalyzer := ingress.NewAnalyzer()
	replicaSetAnalyzer := replicaset.NewAnalyzer()
	statefulSetAnalyzer := statefulset.NewAnalyzer()
	daemonSetAnalyzer := daemonset.NewAnalyzer()
	deploymentAnalyzer := deployment.NewAnalyzer()
	workloadAnalyzer := workload.NewAnalyzer(serviceAnalyzer, ingressAnalyzer, replicaSetAnalyzer, statefulSetAnalyzer,
		daemonSetAnalyzer, deploymentAnalyzer)
	analysisScheduler := analyzer.NewAnalysisScheduler(podAnalyzer, trafficAnalyzer, workloadAnalyzer)
	return Container{
		AnalysisScheduler: analysisScheduler,
	}
}
