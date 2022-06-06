package service

import (
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"karto/analyzer/shared"
	"karto/commons"
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
	targetPods := commons.Filter(pods, func(pod *corev1.Pod) bool {
		return analyzer.sameNamespace(pod, service) &&
			analyzer.podLabelsMatch(pod.Labels, service.Spec.Selector)
	})
	return &types.Service{
		Name:       service.Name,
		Namespace:  service.Namespace,
		TargetPods: commons.Map(targetPods, shared.ToPodRef),
	}
}

func (analyzer analyzerImpl) sameNamespace(pod *corev1.Pod, service *corev1.Service) bool {
	return pod.Namespace == service.Namespace
}

func (analyzer analyzerImpl) podLabelsMatch(objectLabels map[string]string, matchLabels map[string]string) bool {
	if matchLabels == nil {
		return false
	}
	return shared.SelectorMatches(objectLabels, *metav1.SetAsLabelSelector(matchLabels))
}
