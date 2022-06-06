package shared

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"karto/types"
)

func ToPodRef(pod *corev1.Pod) types.PodRef {
	return types.PodRef{
		Name:      pod.Name,
		Namespace: pod.Namespace,
	}
}

func ToServiceRef(service *corev1.Service) types.ServiceRef {
	return types.ServiceRef{
		Name:      service.Name,
		Namespace: service.Namespace,
	}
}

func ToReplicaSetRef(replicaSet *appsv1.ReplicaSet) types.ReplicaSetRef {
	return types.ReplicaSetRef{
		Name:      replicaSet.Name,
		Namespace: replicaSet.Namespace,
	}
}
