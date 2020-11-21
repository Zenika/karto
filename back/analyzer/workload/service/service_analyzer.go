package service

import (
	corev1 "k8s.io/api/core/v1"
	"karto/analyzer/utils"
	"karto/types"
)

type Analyzer interface {
	Analyze(service *corev1.Service, pods []*corev1.Pod) *types.Service
}

type analyzerImpl struct{}

func NewAnalyzer() Analyzer {
	return analyzerImpl{}
}

func (analyzer analyzerImpl) Analyze(service *corev1.Service, pods []*corev1.Pod) *types.Service {
	targetPods := make([]types.PodRef, 0)
	for _, pod := range pods {
		namespaceMatches := analyzer.serviceNamespaceMatches(pod, service)
		selectorMatches := utils.LabelsMatches(pod.Labels, service.Spec.Selector)
		if namespaceMatches && selectorMatches {
			targetPods = append(targetPods, analyzer.toPodRef(pod))
		}
	}
	return &types.Service{
		Name:       service.Name,
		Namespace:  service.Namespace,
		TargetPods: targetPods,
	}
}

func (analyzer analyzerImpl) serviceNamespaceMatches(pod *corev1.Pod, service *corev1.Service) bool {
	return pod.Namespace == service.Namespace
}

func (analyzer analyzerImpl) toPodRef(pod *corev1.Pod) types.PodRef {
	return types.PodRef{
		Name:      pod.Name,
		Namespace: pod.Namespace,
	}
}
