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

func NewAnalyzer(serviceAnalyzer service.Analyzer, ingressAnalyzer ingress.Analyzer,
	replicaSetAnalyzer replicaset.Analyzer, statefulSetAnalyzer statefulset.Analyzer,
	daemonSetAnalyzer daemonset.Analyzer, deploymentAnalyzer deployment.Analyzer) Analyzer {
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

func (analyzer analyzerImpl) allServicesWithTargetPods(services []*corev1.Service,
	pods []*corev1.Pod) []*types.Service {
	servicesWithTargetPods := make([]*types.Service, 0)
	for _, svc := range services {
		serviceWithTargetPods := analyzer.serviceAnalyzer.Analyze(svc, pods)
		servicesWithTargetPods = append(servicesWithTargetPods, serviceWithTargetPods)
	}
	return servicesWithTargetPods
}

func (analyzer analyzerImpl) allIngressesWithTargetServices(ingresses []*networkingv1.Ingress,
	services []*corev1.Service) []*types.Ingress {
	ingressesWithTargetServices := make([]*types.Ingress, 0)
	for _, ing := range ingresses {
		ingressWithTargetServices := analyzer.ingressAnalyzer.Analyze(ing, services)
		if ingressWithTargetServices != nil {
			ingressesWithTargetServices = append(ingressesWithTargetServices, ingressWithTargetServices)
		}
	}
	return ingressesWithTargetServices
}

func (analyzer analyzerImpl) allReplicaSetsWithTargetPods(replicaSets []*appsv1.ReplicaSet,
	pods []*corev1.Pod) []*types.ReplicaSet {
	replicaSetsWithTargetPods := make([]*types.ReplicaSet, 0)
	for _, rs := range replicaSets {
		replicaSetWithTargetPods := analyzer.replicaSetAnalyzer.Analyze(rs, pods)
		if replicaSetWithTargetPods != nil {
			replicaSetsWithTargetPods = append(replicaSetsWithTargetPods, replicaSetWithTargetPods)
		}
	}
	return replicaSetsWithTargetPods
}

func (analyzer analyzerImpl) allStatefulSetsWithTargetPods(statefulSets []*appsv1.StatefulSet,
	pods []*corev1.Pod) []*types.StatefulSet {
	statefulSetsWithTargetPods := make([]*types.StatefulSet, 0)
	for _, ss := range statefulSets {
		statefulSetWithTargetPods := analyzer.statefulSetAnalyzer.Analyze(ss, pods)
		if statefulSetWithTargetPods != nil {
			statefulSetsWithTargetPods = append(statefulSetsWithTargetPods, statefulSetWithTargetPods)
		}
	}
	return statefulSetsWithTargetPods
}

func (analyzer analyzerImpl) allDaemonSetsWithTargetPods(daemonSets []*appsv1.DaemonSet,
	pods []*corev1.Pod) []*types.DaemonSet {
	daemonSetsWithTargetPods := make([]*types.DaemonSet, 0)
	for _, ds := range daemonSets {
		daemonSetWithTargetPods := analyzer.daemonSetAnalyzer.Analyze(ds, pods)
		if daemonSetWithTargetPods != nil {
			daemonSetsWithTargetPods = append(daemonSetsWithTargetPods, daemonSetWithTargetPods)
		}
	}
	return daemonSetsWithTargetPods
}

func (analyzer analyzerImpl) allDeploymentsWithTargetReplicaSets(deployments []*appsv1.Deployment,
	replicaSets []*appsv1.ReplicaSet) []*types.Deployment {
	deploymentsWithTargetReplicaSets := make([]*types.Deployment, 0)
	for _, deploy := range deployments {
		deploymentWithTargetReplicaSets := analyzer.deploymentAnalyzer.Analyze(deploy, replicaSets)
		if deploymentWithTargetReplicaSets != nil {
			deploymentsWithTargetReplicaSets = append(deploymentsWithTargetReplicaSets, deploymentWithTargetReplicaSets)
		}
	}
	return deploymentsWithTargetReplicaSets
}
