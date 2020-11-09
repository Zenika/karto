package traffic

import (
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"karto/analyzer/traffic/allowedroute"
	"karto/analyzer/traffic/podisolation"
	"karto/analyzer/traffic/shared"
	"karto/types"
)

type Analyzer interface {
	Analyze(pods []*corev1.Pod, namespaces []*corev1.Namespace, networkPolicies []*networkingv1.NetworkPolicy) ([]types.PodIsolation, []types.AllowedRoute)
}

type analyzerImpl struct {
	podIsolationAnalyzer podisolation.Analyzer
	allowedRouteAnalyzer allowedroute.Analyzer
}

func NewAnalyzer(podIsolationAnalyzer podisolation.Analyzer, allowedRouteAnalyzer allowedroute.Analyzer) Analyzer {
	return analyzerImpl{
		podIsolationAnalyzer: podIsolationAnalyzer,
		allowedRouteAnalyzer: allowedRouteAnalyzer,
	}
}

func (analyzer analyzerImpl) Analyze(pods []*corev1.Pod, namespaces []*corev1.Namespace, networkPolicies []*networkingv1.NetworkPolicy) ([]types.PodIsolation, []types.AllowedRoute) {
	podIsolations := analyzer.podIsolationsOfAllPods(pods, networkPolicies)
	allowedRoutes := analyzer.allowedRoutesOfAllPods(podIsolations, namespaces)
	return analyzer.toPodIsolations(podIsolations), allowedRoutes
}

func (analyzer analyzerImpl) podIsolationsOfAllPods(pods []*corev1.Pod, policies []*networkingv1.NetworkPolicy) []shared.PodIsolation {
	podIsolations := make([]shared.PodIsolation, 0)
	for _, pod := range pods {
		podIsolation := analyzer.podIsolationAnalyzer.Analyze(pod, policies)
		podIsolations = append(podIsolations, podIsolation)
	}
	return podIsolations
}

func (analyzer analyzerImpl) allowedRoutesOfAllPods(podIsolations []shared.PodIsolation, namespaces []*corev1.Namespace) []types.AllowedRoute {
	allowedRoutes := make([]types.AllowedRoute, 0)
	for i, sourcePodIsolation := range podIsolations {
		for j, targetPodIsolation := range podIsolations {
			if i == j {
				// Ignore traffic to itself
				continue
			}
			allowedRoute := analyzer.allowedRouteAnalyzer.Analyze(sourcePodIsolation, targetPodIsolation, namespaces)
			if allowedRoute != nil {
				allowedRoutes = append(allowedRoutes, *allowedRoute)
			}
		}
	}
	return allowedRoutes
}

func (analyzer analyzerImpl) toPodIsolations(podIsolations []shared.PodIsolation) []types.PodIsolation {
	result := make([]types.PodIsolation, 0)
	for _, podIsolation := range podIsolations {
		result = append(result, podIsolation.ToPodIsolation())
	}
	return result
}
