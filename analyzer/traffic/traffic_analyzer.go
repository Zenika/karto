package traffic

import (
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"karto/analyzer/traffic/allowedroute"
	"karto/analyzer/traffic/podisolation"
	t "karto/analyzer/traffic/types"
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
	return analyzer.toPodIsolations(podIsolations), analyzer.toAllowedRoutes(allowedRoutes)
}

func (analyzer analyzerImpl) podIsolationsOfAllPods(pods []*corev1.Pod, policies []*networkingv1.NetworkPolicy) []t.PodIsolation {
	podIsolations := make([]t.PodIsolation, 0)
	for _, pod := range pods {
		podIsolation := analyzer.podIsolationAnalyzer.Analyze(pod, policies)
		podIsolations = append(podIsolations, podIsolation)
	}
	return podIsolations
}

func (analyzer analyzerImpl) allowedRoutesOfAllPods(podIsolations []t.PodIsolation, namespaces []*corev1.Namespace) []t.AllowedRoute {
	allowedRoutes := make([]t.AllowedRoute, 0)
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

func (analyzer analyzerImpl) toPodIsolations(podIsolations []t.PodIsolation) []types.PodIsolation {
	result := make([]types.PodIsolation, 0)
	for _, podIsolation := range podIsolations {
		result = append(result, analyzer.toPodIsolation(podIsolation))
	}
	return result
}

func (analyzer analyzerImpl) toPodIsolation(podIsolation t.PodIsolation) types.PodIsolation {
	return types.PodIsolation{
		Pod:               analyzer.toPodRef(podIsolation),
		IsIngressIsolated: podIsolation.IsIngressIsolated(),
		IsEgressIsolated:  podIsolation.IsEgressIsolated(),
	}
}

func (analyzer analyzerImpl) toPodRef(podIsolation t.PodIsolation) types.PodRef {
	return types.PodRef{
		Name:      podIsolation.Pod.Name,
		Namespace: podIsolation.Pod.Namespace,
	}
}

func (analyzer analyzerImpl) toAllowedRoutes(allowedRoutes []t.AllowedRoute) []types.AllowedRoute {
	result := make([]types.AllowedRoute, 0)
	for _, allowedRoute := range allowedRoutes {
		result = append(result, analyzer.toAllowedRoute(allowedRoute))
	}
	return result
}

func (analyzer analyzerImpl) toAllowedRoute(allowedRoute t.AllowedRoute) types.AllowedRoute {
	return types.AllowedRoute{
		SourcePod:       analyzer.toPodRef(allowedRoute.SourcePod),
		EgressPolicies:  analyzer.toNetworkPolicies(allowedRoute.EgressPolicies),
		TargetPod:       analyzer.toPodRef(allowedRoute.TargetPod),
		IngressPolicies: analyzer.toNetworkPolicies(allowedRoute.IngressPolicies),
		Ports:           allowedRoute.Ports,
	}
}

func (analyzer analyzerImpl) toNetworkPolicies(networkPolicies []*networkingv1.NetworkPolicy) []types.NetworkPolicy {
	result := make([]types.NetworkPolicy, 0)
	for _, networkPolicy := range networkPolicies {
		result = append(result, analyzer.toNetworkPolicy(*networkPolicy))
	}
	return result
}

func (analyzer analyzerImpl) toNetworkPolicy(networkPolicy networkingv1.NetworkPolicy) types.NetworkPolicy {
	return types.NetworkPolicy{
		Name:      networkPolicy.Name,
		Namespace: networkPolicy.Namespace,
		Labels:    networkPolicy.Labels,
	}
}
