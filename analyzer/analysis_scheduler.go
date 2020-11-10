package analyzer

import (
	"karto/analyzer/pod"
	"karto/analyzer/traffic"
	"karto/analyzer/workload"
	"karto/types"
	"log"
	"time"
)

type AnalysisScheduler interface {
	AnalyzeOnClusterStateChange(clusterStateChannel <-chan types.ClusterState, resultsChannel chan<- types.AnalysisResult)
}

type analysisSchedulerImpl struct {
	podAnalyzer      pod.Analyzer
	trafficAnalyzer  traffic.Analyzer
	workloadAnalyzer workload.Analyzer
}

func NewAnalysisScheduler(podAnalyzer pod.Analyzer, trafficAnalyzer traffic.Analyzer, workloadAnalyzer workload.Analyzer) AnalysisScheduler {
	return analysisSchedulerImpl{
		podAnalyzer:      podAnalyzer,
		trafficAnalyzer:  trafficAnalyzer,
		workloadAnalyzer: workloadAnalyzer,
	}
}

func (analysisScheduler analysisSchedulerImpl) AnalyzeOnClusterStateChange(clusterStateChannel <-chan types.ClusterState, resultsChannel chan<- types.AnalysisResult) {
	for {
		clusterState := <-clusterStateChannel
		analysisResult := analysisScheduler.analyze(clusterState)
		resultsChannel <- analysisResult
	}
}

func (analysisScheduler analysisSchedulerImpl) analyze(clusterState types.ClusterState) types.AnalysisResult {
	start := time.Now()
	pods := analysisScheduler.podAnalyzer.Analyze(clusterState.Pods)
	podIsolations, allowedRoutes := analysisScheduler.trafficAnalyzer.Analyze(clusterState.Pods, clusterState.Namespaces, clusterState.NetworkPolicies)
	services, replicaSets, deployments := analysisScheduler.workloadAnalyzer.Analyze(clusterState.Pods, clusterState.Services, clusterState.ReplicaSets, clusterState.Deployments)
	elapsed := time.Since(start)
	log.Printf("Finished analysis in %s, found: %d pods, %d allowed routes, %d services, %d replicaSets and %d deployments\n",
		elapsed, len(pods), len(allowedRoutes), len(services), len(replicaSets), len(deployments))
	return types.AnalysisResult{
		Pods:          pods,
		PodIsolations: podIsolations,
		AllowedRoutes: allowedRoutes,
		Services:      services,
		ReplicaSets:   replicaSets,
		Deployments:   deployments,
	}
}
