package daemonset

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"karto/analyzer/shared"
	"karto/commons"
	"karto/types"
)

type Analyzer interface {
	Analyze(daemonSet *appsv1.DaemonSet, pods []*corev1.Pod) *types.DaemonSet
}

type analyzerImpl struct{}

func NewAnalyzer() Analyzer {
	return analyzerImpl{}
}

func (analyzer analyzerImpl) Analyze(daemonSet *appsv1.DaemonSet, pods []*corev1.Pod) *types.DaemonSet {
	targetPods := commons.Filter(pods, func(pod *corev1.Pod) bool {
		return shared.IsOwnedBy(pod, daemonSet)
	})
	return &types.DaemonSet{
		Name:       daemonSet.Name,
		Namespace:  daemonSet.Namespace,
		TargetPods: commons.Map(targetPods, shared.ToPodRef),
	}
}
