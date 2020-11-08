package pod

import (
	corev1 "k8s.io/api/core/v1"
	"karto/types"
)

type Analyzer interface {
	Analyze(pods []*corev1.Pod) []types.Pod
}

type analyzerImpl struct{}

func NewAnalyzer() Analyzer {
	return analyzerImpl{}
}

func (analyzer analyzerImpl) Analyze(pods []*corev1.Pod) []types.Pod {
	return analyzer.toPods(pods)
}

func (analyzer analyzerImpl) toPods(pods []*corev1.Pod) []types.Pod {
	result := make([]types.Pod, 0)
	for _, pod := range pods {
		result = append(result, analyzer.toPod(pod))
	}
	return result
}

func (analyzer analyzerImpl) toPod(pod *corev1.Pod) types.Pod {
	return types.Pod{
		Name:      pod.Name,
		Namespace: pod.Namespace,
		Labels:    pod.Labels,
	}
}
