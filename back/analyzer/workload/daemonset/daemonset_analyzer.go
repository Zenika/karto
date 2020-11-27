package daemonset

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"karto/analyzer/utils"
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
	targetPods := make([]types.PodRef, 0)
	for _, pod := range pods {
		namespaceMatches := analyzer.daemonSetNamespaceMatches(pod, daemonSet)
		selectorMatches := utils.SelectorMatches(pod.Labels, *daemonSet.Spec.Selector)
		if namespaceMatches && selectorMatches {
			targetPods = append(targetPods, analyzer.toPodRef(pod))
		}
	}
	return &types.DaemonSet{
		Name:       daemonSet.Name,
		Namespace:  daemonSet.Namespace,
		TargetPods: targetPods,
	}
}

func (analyzer analyzerImpl) daemonSetNamespaceMatches(pod *corev1.Pod, daemonSet *appsv1.DaemonSet) bool {
	return pod.Namespace == daemonSet.Namespace
}

func (analyzer analyzerImpl) toPodRef(pod *corev1.Pod) types.PodRef {
	return types.PodRef{
		Name:      pod.Name,
		Namespace: pod.Namespace,
	}
}
