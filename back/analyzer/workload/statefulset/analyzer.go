package statefulset

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"karto/analyzer/shared"
	"karto/commons"
	"karto/types"
)

type Analyzer interface {
	Analyze(statefulSet *appsv1.StatefulSet, pods []*corev1.Pod) *types.StatefulSet
}

type analyzerImpl struct{}

func NewAnalyzer() Analyzer {
	return analyzerImpl{}
}

func (analyzer analyzerImpl) Analyze(statefulSet *appsv1.StatefulSet, pods []*corev1.Pod) *types.StatefulSet {
	if *statefulSet.Spec.Replicas == 0 {
		return nil
	}
	targetPods := commons.Filter(pods, func(pod *corev1.Pod) bool {
		return shared.IsOwnedBy(pod, statefulSet)
	})
	return &types.StatefulSet{
		Name:       statefulSet.Name,
		Namespace:  statefulSet.Namespace,
		TargetPods: commons.Map(targetPods, shared.ToPodRef),
	}
}
