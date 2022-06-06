package traffic

import (
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"karto/analyzer/shared"
	"karto/analyzer/traffic/allowedroute"
	"karto/analyzer/traffic/podisolation"
	"karto/commons"
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
	allowedRoutes := analyzer.allowedRoutesBetweenPods(podIsolations, clusterState.Namespaces)
	return AnalysisResult{
		Pods: commons.Map(podIsolations, func(podIsolation *shared.PodIsolation) *types.PodIsolation {
			return podIsolation.ToPodIsolation()
		}),
		AllowedRoutes: allowedRoutes,
	}
}

func (analyzer analyzerImpl) podIsolationsOfAllPods(
	pods []*corev1.Pod,
	policies []*networkingv1.NetworkPolicy,
) []*shared.PodIsolation {
	return commons.Map(pods, func(pod *corev1.Pod) *shared.PodIsolation {
		return analyzer.podIsolationAnalyzer.Analyze(pod, policies)
	})
}

func (analyzer analyzerImpl) allowedRoutesBetweenPods(
	podIsolations []*shared.PodIsolation,
	namespaces []*corev1.Namespace,
) []*types.AllowedRoute {
	podPairs := commons.AllPairs(podIsolations)
	return commons.MapAndKeepNotNil(podPairs,
		func(podPair commons.Pair[*shared.PodIsolation, *shared.PodIsolation]) *types.AllowedRoute {
			return analyzer.allowedRouteAnalyzer.Analyze(podPair.Left, podPair.Right, namespaces)
		},
	)
}
