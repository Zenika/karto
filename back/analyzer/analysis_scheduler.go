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
	AnalyzeOnClusterStateChange(clusterStateChannel <-chan types.ClusterState,
		resultsChannel chan<- types.AnalysisResult)
}

type analysisSchedulerImpl struct {
	podAnalyzer      pod.Analyzer
	trafficAnalyzer  traffic.Analyzer
	workloadAnalyzer workload.Analyzer
}

func NewAnalysisScheduler(podAnalyzer pod.Analyzer, trafficAnalyzer traffic.Analyzer,
	workloadAnalyzer workload.Analyzer) AnalysisScheduler {
	return analysisSchedulerImpl{
		podAnalyzer:      podAnalyzer,
		trafficAnalyzer:  trafficAnalyzer,
		workloadAnalyzer: workloadAnalyzer,
	}
}

func (analysisScheduler analysisSchedulerImpl) AnalyzeOnClusterStateChange(
	clusterStateChannel <-chan types.ClusterState, resultsChannel chan<- types.AnalysisResult) {
	for {
		clusterState := <-clusterStateChannel
		analysisResult := analysisScheduler.analyze(clusterState)
		resultsChannel <- analysisResult
	}
}

func (analysisScheduler analysisSchedulerImpl) analyze(clusterState types.ClusterState) types.AnalysisResult {
	start := time.Now()
	podsResult := analysisScheduler.podAnalyzer.Analyze(pod.ClusterState{
		Pods: clusterState.Pods,
	})
	trafficResult := analysisScheduler.trafficAnalyzer.Analyze(traffic.ClusterState{
		Pods:            clusterState.Pods,
		Namespaces:      clusterState.Namespaces,
		NetworkPolicies: clusterState.NetworkPolicies,
	})
	workloadResult := analysisScheduler.workloadAnalyzer.Analyze(workload.ClusterState{
		Pods:         clusterState.Pods,
		Services:     clusterState.Services,
		ReplicaSets:  clusterState.ReplicaSets,
		StatefulSets: clusterState.StatefulSets,
		DaemonSets:   clusterState.DaemonSets,
		Deployments:  clusterState.Deployments,
	})
	pods := podsResult.Pods
	podIsolations := trafficResult.Pods
	allowedRoutes := trafficResult.AllowedRoutes
	services := workloadResult.Services
	replicaSets := workloadResult.ReplicaSets
	statefulSets := workloadResult.StatefulSets
	daemonSets := workloadResult.DaemonSets
	deployments := workloadResult.Deployments
	elapsed := time.Since(start)
	log.Printf("Finished analysis in %s, found: %d pods, %d allowed routes, %d services, %d replicaSets, "+
		"%d statefulSets, %d daemonSets and %d deployments\n", elapsed, len(pods), len(allowedRoutes), len(services),
		len(replicaSets), len(statefulSets), len(daemonSets), len(deployments))
	return types.AnalysisResult{
		Pods:          pods,
		PodIsolations: podIsolations,
		AllowedRoutes: allowedRoutes,
		Services:      services,
		ReplicaSets:   replicaSets,
		StatefulSets:  statefulSets,
		DaemonSets:    daemonSets,
		Deployments:   deployments,
	}
}
