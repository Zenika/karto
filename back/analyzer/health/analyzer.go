package health

import (
	corev1 "k8s.io/api/core/v1"
	"karto/analyzer/health/podhealth"
	"karto/commons"
	"karto/types"
)

type ClusterState struct {
	Pods []*corev1.Pod
}

type AnalysisResult struct {
	Pods []*types.PodHealth
}

type Analyzer interface {
	Analyze(clusterState ClusterState) AnalysisResult
}

type analyzerImpl struct {
	podHealthAnalyzer podhealth.Analyzer
}

func NewAnalyzer(podHealthAnalyzer podhealth.Analyzer) Analyzer {
	return analyzerImpl{
		podHealthAnalyzer: podHealthAnalyzer,
	}
}

func (analyzer analyzerImpl) Analyze(clusterState ClusterState) AnalysisResult {
	podsHealth := commons.Map(clusterState.Pods, analyzer.podHealthAnalyzer.Analyze)
	return AnalysisResult{
		Pods: podsHealth,
	}
}
