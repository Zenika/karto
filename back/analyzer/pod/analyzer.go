package pod

import (
	corev1 "k8s.io/api/core/v1"
	"karto/commons"
	"karto/types"
)

type ClusterState struct {
	Pods []*corev1.Pod
}

type AnalysisResult struct {
	Pods []*types.Pod
}

type Analyzer interface {
	Analyze(clusterState ClusterState) AnalysisResult
}

type analyzerImpl struct{}

func NewAnalyzer() Analyzer {
	return analyzerImpl{}
}

func (analyzer analyzerImpl) Analyze(clusterState ClusterState) AnalysisResult {
	Pods := commons.Map(clusterState.Pods, analyzer.toPod)
	return AnalysisResult{
		Pods: Pods,
	}
}

func (analyzer analyzerImpl) toPod(pod *corev1.Pod) *types.Pod {
	return &types.Pod{
		Name:      pod.Name,
		Namespace: pod.Namespace,
		Labels:    pod.Labels,
	}
}
