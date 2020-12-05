package replicaset

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
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
	targetPods := make([]types.PodRef, 0)
	for _, pod := range pods {
		for _, ownerReference := range pod.OwnerReferences {
			if ownerReference.UID == replicaSet.UID {
				targetPods = append(targetPods, analyzer.toPodRef(pod))
				break
			}
		}
	}
	return &types.ReplicaSet{
		Name:       replicaSet.Name,
		Namespace:  replicaSet.Namespace,
		TargetPods: targetPods,
	}
}

func (analyzer analyzerImpl) toPodRef(pod *corev1.Pod) types.PodRef {
	return types.PodRef{
		Name:      pod.Name,
		Namespace: pod.Namespace,
	}
}
