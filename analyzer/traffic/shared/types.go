package shared

import (
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"karto/types"
)

type PodIsolation struct {
	Pod             *corev1.Pod
	IngressPolicies []*networkingv1.NetworkPolicy
	EgressPolicies  []*networkingv1.NetworkPolicy
}

func (podIsolation *PodIsolation) IsIngressIsolated() bool {
	return len(podIsolation.IngressPolicies) != 0
}

func (podIsolation *PodIsolation) IsEgressIsolated() bool {
	return len(podIsolation.EgressPolicies) != 0
}

func (podIsolation *PodIsolation) AddIngressPolicy(ingressPolicy *networkingv1.NetworkPolicy) {
	podIsolation.IngressPolicies = append(podIsolation.IngressPolicies, ingressPolicy)
}

func (podIsolation *PodIsolation) AddEgressPolicy(egressPolicy *networkingv1.NetworkPolicy) {
	podIsolation.EgressPolicies = append(podIsolation.EgressPolicies, egressPolicy)
}

func (podIsolation *PodIsolation) ToPodRef() types.PodRef {
	return types.PodRef{
		Name:      podIsolation.Pod.Name,
		Namespace: podIsolation.Pod.Namespace,
	}
}

func (podIsolation *PodIsolation) ToPodIsolation() types.PodIsolation {
	return types.PodIsolation{
		Pod:               podIsolation.ToPodRef(),
		IsIngressIsolated: podIsolation.IsIngressIsolated(),
		IsEgressIsolated:  podIsolation.IsEgressIsolated(),
	}
}

func NewPodIsolation(pod *corev1.Pod) PodIsolation {
	return PodIsolation{
		Pod:             pod,
		IngressPolicies: make([]*networkingv1.NetworkPolicy, 0),
		EgressPolicies:  make([]*networkingv1.NetworkPolicy, 0),
	}
}
