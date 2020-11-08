package workload

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"karto/analyzer/utils"
	"karto/types"
)

type Analyzer interface {
	Analyze(pods []*corev1.Pod, services []*corev1.Service, replicaSets []*appsv1.ReplicaSet, deployments []*appsv1.Deployment) ([]types.Service, []types.ReplicaSet, []types.Deployment)
}

type analyzerImpl struct{}

func NewAnalyzer() Analyzer {
	return analyzerImpl{}
}

func (analyzer analyzerImpl) Analyze(pods []*corev1.Pod, services []*corev1.Service, replicaSets []*appsv1.ReplicaSet, deployments []*appsv1.Deployment) ([]types.Service, []types.ReplicaSet, []types.Deployment) {
	servicesWithTargetPods := analyzer.allServicesWithTargetPods(services, pods)
	replicaSetsWithTargetPods := analyzer.allReplicaSetsWithTargetPods(replicaSets, pods)
	deploymentsWithTargetReplicaSets := analyzer.allDeploymentsWithTargetReplicaSets(deployments, replicaSets)
	return servicesWithTargetPods, replicaSetsWithTargetPods, deploymentsWithTargetReplicaSets
}

func (analyzer analyzerImpl) allServicesWithTargetPods(services []*corev1.Service, pods []*corev1.Pod) []types.Service {
	servicesWithTargetPods := make([]types.Service, 0)
	for _, service := range services {
		serviceWithTargetPods := analyzer.serviceWithTargetPods(service, pods)
		servicesWithTargetPods = append(servicesWithTargetPods, serviceWithTargetPods)
	}
	return servicesWithTargetPods
}

func (analyzer analyzerImpl) serviceWithTargetPods(service *corev1.Service, pods []*corev1.Pod) types.Service {
	targetPods := make([]types.PodRef, 0)
	for _, pod := range pods {
		namespaceMatches := analyzer.serviceNamespaceMatches(pod, service)
		selectorMatches := utils.LabelsMatches(pod.Labels, service.Spec.Selector)
		if namespaceMatches && selectorMatches {
			targetPods = append(targetPods, analyzer.toPodRef(pod))
		}
	}
	return types.Service{
		Name:       service.Name,
		Namespace:  service.Namespace,
		TargetPods: targetPods,
	}
}

func (analyzer analyzerImpl) allReplicaSetsWithTargetPods(replicaSets []*appsv1.ReplicaSet, pods []*corev1.Pod) []types.ReplicaSet {
	replicaSetsWithTargetPods := make([]types.ReplicaSet, 0)
	for _, replicaSet := range replicaSets {
		replicaSetWithTargetPods := analyzer.replicaSetWithTargetPods(replicaSet, pods)
		if replicaSetWithTargetPods != nil {
			replicaSetsWithTargetPods = append(replicaSetsWithTargetPods, *replicaSetWithTargetPods)
		}
	}
	return replicaSetsWithTargetPods
}

func (analyzer analyzerImpl) replicaSetWithTargetPods(replicaSet *appsv1.ReplicaSet, pods []*corev1.Pod) *types.ReplicaSet {
	if *replicaSet.Spec.Replicas == 0 {
		return nil
	}
	targetPods := make([]types.PodRef, 0)
	for _, pod := range pods {
		namespaceMatches := analyzer.replicaSetNamespaceMatches(pod, replicaSet)
		selectorMatches := utils.SelectorMatches(pod.Labels, *replicaSet.Spec.Selector)
		if namespaceMatches && selectorMatches {
			targetPods = append(targetPods, analyzer.toPodRef(pod))
		}
	}
	return &types.ReplicaSet{
		Name:       replicaSet.Name,
		Namespace:  replicaSet.Namespace,
		TargetPods: targetPods,
	}
}

func (analyzer analyzerImpl) allDeploymentsWithTargetReplicaSets(deployments []*appsv1.Deployment, replicaSets []*appsv1.ReplicaSet) []types.Deployment {
	deploymentsWithTargetReplicaSets := make([]types.Deployment, 0)
	for _, deployment := range deployments {
		deploymentWithTargetReplicaSets := analyzer.deploymentWithTargetReplicaSets(deployment, replicaSets)
		if deploymentWithTargetReplicaSets != nil {
			deploymentsWithTargetReplicaSets = append(deploymentsWithTargetReplicaSets, *deploymentWithTargetReplicaSets)
		}
	}
	return deploymentsWithTargetReplicaSets
}

func (analyzer analyzerImpl) deploymentWithTargetReplicaSets(deployment *appsv1.Deployment, replicaSets []*appsv1.ReplicaSet) *types.Deployment {
	targetReplicaSets := make([]types.ReplicaSetRef, 0)
	for _, replicaSet := range replicaSets {
		if *replicaSet.Spec.Replicas == 0 {
			continue
		}
		for _, ownerReference := range replicaSet.OwnerReferences {
			if ownerReference.UID == deployment.UID {
				targetReplicaSets = append(targetReplicaSets, analyzer.toReplicaSetRef(replicaSet))
				break
			}
		}
	}
	return &types.Deployment{
		Name:              deployment.Name,
		Namespace:         deployment.Namespace,
		TargetReplicaSets: targetReplicaSets,
	}
}

func (analyzer analyzerImpl) serviceNamespaceMatches(pod *corev1.Pod, service *corev1.Service) bool {
	return pod.Namespace == service.Namespace
}

func (analyzer analyzerImpl) replicaSetNamespaceMatches(pod *corev1.Pod, replicaSet *appsv1.ReplicaSet) bool {
	return pod.Namespace == replicaSet.Namespace
}

func (analyzer analyzerImpl) toPodRef(pod *corev1.Pod) types.PodRef {
	return types.PodRef{
		Name:      pod.Name,
		Namespace: pod.Namespace,
	}
}

func (analyzer analyzerImpl) toReplicaSetRef(replicaSet *appsv1.ReplicaSet) types.ReplicaSetRef {
	return types.ReplicaSetRef{
		Name:      replicaSet.Name,
		Namespace: replicaSet.Namespace,
	}
}
