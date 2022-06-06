package replicaset

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"karto/analyzer/shared"
	"karto/commons"
	"karto/types"
)

type Analyzer interface {
	Analyze(replicaSet *appsv1.ReplicaSet, pods []*corev1.Pod) *types.ReplicaSet
}

type analyzerImpl struct{}

func NewAnalyzer() Analyzer {
	return analyzerImpl{}
}

func (analyzer analyzerImpl) Analyze(replicaSet *appsv1.ReplicaSet, pods []*corev1.Pod) *types.ReplicaSet {
	if *replicaSet.Spec.Replicas == 0 {
		return nil
	}
	targetPods := commons.Filter(pods, func(pod *corev1.Pod) bool {
		return shared.IsOwnedBy(pod, replicaSet)
	})
	return &types.ReplicaSet{
		Name:       replicaSet.Name,
		Namespace:  replicaSet.Namespace,
		TargetPods: commons.Map(targetPods, shared.ToPodRef),
	}
}
