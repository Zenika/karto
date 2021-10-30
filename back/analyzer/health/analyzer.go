package health

import (
	corev1 "k8s.io/api/core/v1"
	"karto/analyzer/health/podhealth"
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
	podHealths := analyzer.podHealthOfAllPods(clusterState.Pods)
	return AnalysisResult{
		Pods: podHealths,
	}
}

func (analyzer analyzerImpl) podHealthOfAllPods(pods []*corev1.Pod) []*types.PodHealth {
	podHealths := make([]*types.PodHealth, 0)
	for _, pod := range pods {
		podHealth := analyzer.podHealthAnalyzer.Analyze(pod)
		podHealths = append(podHealths, podHealth)
	}
	return podHealths
}
