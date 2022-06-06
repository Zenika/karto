package workload

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"karto/analyzer/workload/daemonset"
	"karto/analyzer/workload/deployment"
	"karto/analyzer/workload/ingress"
	"karto/analyzer/workload/replicaset"
	"karto/analyzer/workload/service"
	"karto/analyzer/workload/statefulset"
	"karto/commons"
	"karto/types"
)

type ClusterState struct {
	Pods         []*corev1.Pod
	Services     []*corev1.Service
	Ingresses    []*networkingv1.Ingress
	ReplicaSets  []*appsv1.ReplicaSet
	StatefulSets []*appsv1.StatefulSet
	DaemonSets   []*appsv1.DaemonSet
	Deployments  []*appsv1.Deployment
}

type AnalysisResult struct {
	Services     []*types.Service
	Ingresses    []*types.Ingress
	ReplicaSets  []*types.ReplicaSet
	StatefulSets []*types.StatefulSet
	DaemonSets   []*types.DaemonSet
	Deployments  []*types.Deployment
}

type Analyzer interface {
	Analyze(clusterState ClusterState) AnalysisResult
}

type analyzerImpl struct {
	serviceAnalyzer     service.Analyzer
	ingressAnalyzer     ingress.Analyzer
	replicaSetAnalyzer  replicaset.Analyzer
	statefulSetAnalyzer statefulset.Analyzer
	daemonSetAnalyzer   daemonset.Analyzer
	deploymentAnalyzer  deployment.Analyzer
}

func NewAnalyzer(
	serviceAnalyzer service.Analyzer,
	ingressAnalyzer ingress.Analyzer,
	replicaSetAnalyzer replicaset.Analyzer,
	statefulSetAnalyzer statefulset.Analyzer,
	daemonSetAnalyzer daemonset.Analyzer,
	deploymentAnalyzer deployment.Analyzer,
) Analyzer {
	return analyzerImpl{
		serviceAnalyzer:     serviceAnalyzer,
		ingressAnalyzer:     ingressAnalyzer,
		replicaSetAnalyzer:  replicaSetAnalyzer,
		statefulSetAnalyzer: statefulSetAnalyzer,
		daemonSetAnalyzer:   daemonSetAnalyzer,
		deploymentAnalyzer:  deploymentAnalyzer,
	}
}

func (analyzer analyzerImpl) Analyze(clusterState ClusterState) AnalysisResult {
	servicesWithTargetPods := analyzer.allServicesWithTargetPods(clusterState.Services, clusterState.Pods)
	ingressesWithTargetServices := analyzer.allIngressesWithTargetServices(clusterState.Ingresses,
		clusterState.Services)
	replicaSetsWithTargetPods := analyzer.allReplicaSetsWithTargetPods(clusterState.ReplicaSets, clusterState.Pods)
	statefulSetsWithTargetPods := analyzer.allStatefulSetsWithTargetPods(clusterState.StatefulSets, clusterState.Pods)
	daemonSetsWithTargetPods := analyzer.allDaemonSetsWithTargetPods(clusterState.DaemonSets, clusterState.Pods)
	deploymentsWithTargetReplicaSets := analyzer.allDeploymentsWithTargetReplicaSets(clusterState.Deployments,
		clusterState.ReplicaSets)
	return AnalysisResult{
		Services:     servicesWithTargetPods,
		Ingresses:    ingressesWithTargetServices,
		ReplicaSets:  replicaSetsWithTargetPods,
		StatefulSets: statefulSetsWithTargetPods,
		DaemonSets:   daemonSetsWithTargetPods,
		Deployments:  deploymentsWithTargetReplicaSets,
	}
}

func (analyzer analyzerImpl) allServicesWithTargetPods(
	services []*corev1.Service,
	pods []*corev1.Pod,
) []*types.Service {
	return commons.Map(services, func(svc *corev1.Service) *types.Service {
		return analyzer.serviceAnalyzer.Analyze(svc, pods)
	})
}

func (analyzer analyzerImpl) allIngressesWithTargetServices(
	ingresses []*networkingv1.Ingress,
	services []*corev1.Service,
) []*types.Ingress {
	return commons.MapAndKeepNotNil(ingresses, func(ing *networkingv1.Ingress) *types.Ingress {
		return analyzer.ingressAnalyzer.Analyze(ing, services)
	})
}

func (analyzer analyzerImpl) allReplicaSetsWithTargetPods(
	replicaSets []*appsv1.ReplicaSet,
	pods []*corev1.Pod,
) []*types.ReplicaSet {
	return commons.MapAndKeepNotNil(replicaSets, func(rs *appsv1.ReplicaSet) *types.ReplicaSet {
		return analyzer.replicaSetAnalyzer.Analyze(rs, pods)
	})
}

func (analyzer analyzerImpl) allStatefulSetsWithTargetPods(
	statefulSets []*appsv1.StatefulSet,
	pods []*corev1.Pod,
) []*types.StatefulSet {
	return commons.MapAndKeepNotNil(statefulSets, func(ss *appsv1.StatefulSet) *types.StatefulSet {
		return analyzer.statefulSetAnalyzer.Analyze(ss, pods)
	})
}

func (analyzer analyzerImpl) allDaemonSetsWithTargetPods(
	daemonSets []*appsv1.DaemonSet,
	pods []*corev1.Pod,
) []*types.DaemonSet {
	return commons.MapAndKeepNotNil(daemonSets, func(ds *appsv1.DaemonSet) *types.DaemonSet {
		return analyzer.daemonSetAnalyzer.Analyze(ds, pods)
	})
}

func (analyzer analyzerImpl) allDeploymentsWithTargetReplicaSets(
	deployments []*appsv1.Deployment,
	replicaSets []*appsv1.ReplicaSet,
) []*types.Deployment {
	return commons.MapAndKeepNotNil(deployments, func(deploy *appsv1.Deployment) *types.Deployment {
		return analyzer.deploymentAnalyzer.Analyze(deploy, replicaSets)
	})
}
