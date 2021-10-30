package ingress

import (
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
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
	targetServices := make([]types.ServiceRef, 0)
	for _, service := range services {
		if !analyzer.ingressNamespaceMatches(service, ingress) {
			continue
		}
		for _, rule := range ingress.Spec.Rules {
			for _, path := range rule.HTTP.Paths {
				if path.Backend.Service.Name == service.Name {
					targetServices = append(targetServices, analyzer.toServiceRef(service))
				}
			}
		}
	}
	return &types.Ingress{
		Name:           ingress.Name,
		Namespace:      ingress.Namespace,
		TargetServices: targetServices,
	}
}

func (analyzer analyzerImpl) ingressNamespaceMatches(service *corev1.Service, ingress *networkingv1.Ingress) bool {
	return service.Namespace == ingress.Namespace
}

func (analyzer analyzerImpl) toServiceRef(service *corev1.Service) types.ServiceRef {
	return types.ServiceRef{
		Name:      service.Name,
		Namespace: service.Namespace,
	}
}
