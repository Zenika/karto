package workload

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"karto/analyzer/workload/deployment"
	"karto/analyzer/workload/replicaset"
	"karto/analyzer/workload/service"
	"karto/types"
)

type Analyzer interface {
	Analyze(pods []*corev1.Pod, services []*corev1.Service, replicaSets []*appsv1.ReplicaSet, deployments []*appsv1.Deployment) ([]*types.Service, []*types.ReplicaSet, []*types.Deployment)
}

type analyzerImpl struct {
	serviceAnalyzer    service.Analyzer
	replicaSetAnalyzer replicaset.Analyzer
	deploymentAnalyzer deployment.Analyzer
}

func NewAnalyzer(serviceAnalyzer service.Analyzer, replicaSetAnalyzer replicaset.Analyzer, deploymentAnalyzer deployment.Analyzer) Analyzer {
	return analyzerImpl{
		serviceAnalyzer:    serviceAnalyzer,
		replicaSetAnalyzer: replicaSetAnalyzer,
		deploymentAnalyzer: deploymentAnalyzer,
	}
}

func (analyzer analyzerImpl) Analyze(pods []*corev1.Pod, services []*corev1.Service, replicaSets []*appsv1.ReplicaSet, deployments []*appsv1.Deployment) ([]*types.Service, []*types.ReplicaSet, []*types.Deployment) {
	servicesWithTargetPods := analyzer.allServicesWithTargetPods(services, pods)
	replicaSetsWithTargetPods := analyzer.allReplicaSetsWithTargetPods(replicaSets, pods)
	deploymentsWithTargetReplicaSets := analyzer.allDeploymentsWithTargetReplicaSets(deployments, replicaSets)
	return servicesWithTargetPods, replicaSetsWithTargetPods, deploymentsWithTargetReplicaSets
}

func (analyzer analyzerImpl) allServicesWithTargetPods(services []*corev1.Service, pods []*corev1.Pod) []*types.Service {
	servicesWithTargetPods := make([]*types.Service, 0)
	for _, svc := range services {
		serviceWithTargetPods := analyzer.serviceAnalyzer.Analyze(svc, pods)
		servicesWithTargetPods = append(servicesWithTargetPods, serviceWithTargetPods)
	}
	return servicesWithTargetPods
}

func (analyzer analyzerImpl) allReplicaSetsWithTargetPods(replicaSets []*appsv1.ReplicaSet, pods []*corev1.Pod) []*types.ReplicaSet {
	replicaSetsWithTargetPods := make([]*types.ReplicaSet, 0)
	for _, rs := range replicaSets {
		replicaSetWithTargetPods := analyzer.replicaSetAnalyzer.Analyze(rs, pods)
		if replicaSetWithTargetPods != nil {
			replicaSetsWithTargetPods = append(replicaSetsWithTargetPods, replicaSetWithTargetPods)
		}
	}
	return replicaSetsWithTargetPods
}

func (analyzer analyzerImpl) allDeploymentsWithTargetReplicaSets(deployments []*appsv1.Deployment, replicaSets []*appsv1.ReplicaSet) []*types.Deployment {
	deploymentsWithTargetReplicaSets := make([]*types.Deployment, 0)
	for _, deploy := range deployments {
		deploymentWithTargetReplicaSets := analyzer.deploymentAnalyzer.Analyze(deploy, replicaSets)
		if deploymentWithTargetReplicaSets != nil {
			deploymentsWithTargetReplicaSets = append(deploymentsWithTargetReplicaSets, deploymentWithTargetReplicaSets)
		}
	}
	return deploymentsWithTargetReplicaSets
}
