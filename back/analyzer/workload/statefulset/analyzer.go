package statefulset

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
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
	targetPods := make([]types.PodRef, 0)
	for _, pod := range pods {
		for _, ownerReference := range pod.OwnerReferences {
			if ownerReference.UID == statefulSet.UID {
				targetPods = append(targetPods, analyzer.toPodRef(pod))
				break
			}
		}
	}
	return &types.StatefulSet{
		Name:       statefulSet.Name,
		Namespace:  statefulSet.Namespace,
		TargetPods: targetPods,
	}
}

func (analyzer analyzerImpl) toPodRef(pod *corev1.Pod) types.PodRef {
	return types.PodRef{
		Name:      pod.Name,
		Namespace: pod.Namespace,
	}
}
