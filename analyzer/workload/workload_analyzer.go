package workload

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"karto/analyzer/utils"
	"karto/types"
)

func Analyze(pods []*corev1.Pod, services []*corev1.Service, replicaSets []*appsv1.ReplicaSet, deployments []*appsv1.Deployment) ([]types.Service, []types.ReplicaSet, []types.Deployment) {
	servicesWithTargetPods := allServicesWithTargetPods(services, pods)
	replicaSetsWithTargetPods := allReplicaSetsWithTargetPods(replicaSets, pods)
	deploymentsWithTargetReplicaSets := allDeploymentsWithTargetReplicaSets(deployments, replicaSets)
	return servicesWithTargetPods, replicaSetsWithTargetPods, deploymentsWithTargetReplicaSets
}

func allServicesWithTargetPods(services []*corev1.Service, pods []*corev1.Pod) []types.Service {
	servicesWithTargetPods := make([]types.Service, 0)
	for _, service := range services {
		serviceWithTargetPods := serviceWithTargetPods(service, pods)
		servicesWithTargetPods = append(servicesWithTargetPods, serviceWithTargetPods)
	}
	return servicesWithTargetPods
}

func serviceWithTargetPods(service *corev1.Service, pods []*corev1.Pod) types.Service {
	targetPods := make([]types.PodRef, 0)
	for _, pod := range pods {
		namespaceMatches := serviceNamespaceMatches(pod, service)
		selectorMatches := utils.LabelsMatches(pod.Labels, service.Spec.Selector)
		if namespaceMatches && selectorMatches {
			targetPods = append(targetPods, toPodRef(pod))
		}
	}
	return types.Service{
		Name:       service.Name,
		Namespace:  service.Namespace,
		TargetPods: targetPods,
	}
}

func allReplicaSetsWithTargetPods(replicaSets []*appsv1.ReplicaSet, pods []*corev1.Pod) []types.ReplicaSet {
	replicaSetsWithTargetPods := make([]types.ReplicaSet, 0)
	for _, replicaSet := range replicaSets {
		replicaSetWithTargetPods := replicaSetWithTargetPods(replicaSet, pods)
		if replicaSetWithTargetPods != nil {
			replicaSetsWithTargetPods = append(replicaSetsWithTargetPods, *replicaSetWithTargetPods)
		}
	}
	return replicaSetsWithTargetPods
}

func replicaSetWithTargetPods(replicaSet *appsv1.ReplicaSet, pods []*corev1.Pod) *types.ReplicaSet {
	if *replicaSet.Spec.Replicas == 0 {
		return nil
	}
	targetPods := make([]types.PodRef, 0)
	for _, pod := range pods {
		namespaceMatches := replicaSetNamespaceMatches(pod, replicaSet)
		selectorMatches := utils.SelectorMatches(pod.Labels, *replicaSet.Spec.Selector)
		if namespaceMatches && selectorMatches {
			targetPods = append(targetPods, toPodRef(pod))
		}
	}
	return &types.ReplicaSet{
		Name:       replicaSet.Name,
		Namespace:  replicaSet.Namespace,
		TargetPods: targetPods,
	}
}

func allDeploymentsWithTargetReplicaSets(deployments []*appsv1.Deployment, replicaSets []*appsv1.ReplicaSet) []types.Deployment {
	deploymentsWithTargetReplicaSets := make([]types.Deployment, 0)
	for _, deployment := range deployments {
		deploymentWithTargetReplicaSets := deploymentWithTargetReplicaSets(deployment, replicaSets)
		if deploymentWithTargetReplicaSets != nil {
			deploymentsWithTargetReplicaSets = append(deploymentsWithTargetReplicaSets, *deploymentWithTargetReplicaSets)
		}
	}
	return deploymentsWithTargetReplicaSets
}

func deploymentWithTargetReplicaSets(deployment *appsv1.Deployment, replicaSets []*appsv1.ReplicaSet) *types.Deployment {
	targetReplicaSets := make([]types.ReplicaSetRef, 0)
	for _, replicaSet := range replicaSets {
		if *replicaSet.Spec.Replicas == 0 {
			continue
		}
		for _, ownerReference := range replicaSet.OwnerReferences {
			if ownerReference.UID == deployment.UID {
				targetReplicaSets = append(targetReplicaSets, toReplicaSetRef(replicaSet))
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

func serviceNamespaceMatches(pod *corev1.Pod, service *corev1.Service) bool {
	return pod.Namespace == service.Namespace
}

func replicaSetNamespaceMatches(pod *corev1.Pod, replicaSet *appsv1.ReplicaSet) bool {
	return pod.Namespace == replicaSet.Namespace
}

func toPodRef(pod *corev1.Pod) types.PodRef {
	return types.PodRef{
		Name:      pod.Name,
		Namespace: pod.Namespace,
	}
}

func toReplicaSetRef(replicaSet *appsv1.ReplicaSet) types.ReplicaSetRef {
	return types.ReplicaSetRef{
		Name:      replicaSet.Name,
		Namespace: replicaSet.Namespace,
	}
}
