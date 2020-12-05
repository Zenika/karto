package traffic

import (
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"karto/analyzer/traffic/allowedroute"
	"karto/analyzer/traffic/podisolation"
	"karto/analyzer/traffic/shared"
	"karto/types"
)

type ClusterState struct {
	Pods            []*corev1.Pod
	Namespaces      []*corev1.Namespace
	NetworkPolicies []*networkingv1.NetworkPolicy
}

type AnalysisResult struct {
	Pods          []*types.PodIsolation
	AllowedRoutes []*types.AllowedRoute
}

type Analyzer interface {
	Analyze(state ClusterState) AnalysisResult
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

func (analyzer analyzerImpl) Analyze(clusterState ClusterState) AnalysisResult {
	podIsolations := analyzer.podIsolationsOfAllPods(clusterState.Pods, clusterState.NetworkPolicies)
	allowedRoutes := analyzer.allowedRoutesOfAllPods(podIsolations, clusterState.Namespaces)
	return AnalysisResult{
		Pods:          analyzer.toPodIsolations(podIsolations),
		AllowedRoutes: allowedRoutes,
	}
}

func (analyzer analyzerImpl) podIsolationsOfAllPods(pods []*corev1.Pod,
	policies []*networkingv1.NetworkPolicy) []*shared.PodIsolation {
	podIsolations := make([]*shared.PodIsolation, 0)
	for _, pod := range pods {
		podIsolation := analyzer.podIsolationAnalyzer.Analyze(pod, policies)
		podIsolations = append(podIsolations, podIsolation)
	}
	return podIsolations
}

func (analyzer analyzerImpl) allowedRoutesOfAllPods(podIsolations []*shared.PodIsolation,
	namespaces []*corev1.Namespace) []*types.AllowedRoute {
	allowedRoutes := make([]*types.AllowedRoute, 0)
	for i, sourcePodIsolation := range podIsolations {
		for j, targetPodIsolation := range podIsolations {
			if i == j {
				// Ignore traffic to itself
				continue
			}
			allowedRoute := analyzer.allowedRouteAnalyzer.Analyze(sourcePodIsolation, targetPodIsolation, namespaces)
			if allowedRoute != nil {
				allowedRoutes = append(allowedRoutes, allowedRoute)
			}
		}
	}
	return allowedRoutes
}

func (analyzer analyzerImpl) toPodIsolations(podIsolations []*shared.PodIsolation) []*types.PodIsolation {
	result := make([]*types.PodIsolation, 0)
	for _, podIsolation := range podIsolations {
		result = append(result, podIsolation.ToPodIsolation())
	}
	return result
}
