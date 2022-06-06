package ingress

import (
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"karto/analyzer/shared"
	"karto/commons"
	"karto/types"
)

type Analyzer interface {
	Analyze(ingress *networkingv1.Ingress, services []*corev1.Service) *types.Ingress
}

type analyzerImpl struct{}

func NewAnalyzer() Analyzer {
	return analyzerImpl{}
}

func (analyzer analyzerImpl) Analyze(ingress *networkingv1.Ingress, services []*corev1.Service) *types.Ingress {
	targetServices := commons.Filter(services, func(service *corev1.Service) bool {
		return analyzer.sameNamespace(service, ingress) &&
			analyzer.isServiceUsedInRoute(service, ingress)
	})
	return &types.Ingress{
		Name:           ingress.Name,
		Namespace:      ingress.Namespace,
		TargetServices: commons.Map(targetServices, shared.ToServiceRef),
	}
}

func (analyzer analyzerImpl) sameNamespace(service *corev1.Service, ingress *networkingv1.Ingress) bool {
	return ingress.Namespace == service.Namespace
}

func (analyzer analyzerImpl) isServiceUsedInRoute(service *corev1.Service, ingress *networkingv1.Ingress) bool {
	return commons.AnyMatch(ingress.Spec.Rules, func(rule networkingv1.IngressRule) bool {
		return commons.AnyMatch(rule.HTTP.Paths, func(path networkingv1.HTTPIngressPath) bool {
			return path.Backend.Service.Name == service.Name
		})
	})
}
