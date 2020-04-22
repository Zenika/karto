package trafficanalyzer

import (
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
)

type podIsolation struct {
	Pod             corev1.Pod
	IngressPolicies []networkingv1.NetworkPolicy
	EgressPolicies  []networkingv1.NetworkPolicy
}

func (podIsolation *podIsolation) isIngressIsolated() bool {
	return len(podIsolation.IngressPolicies) != 0
}

func (podIsolation *podIsolation) isEgressIsolated() bool {
	return len(podIsolation.EgressPolicies) != 0
}

func (podIsolation *podIsolation) addIngressPolicy(ingressPolicy networkingv1.NetworkPolicy) {
	podIsolation.IngressPolicies = append(podIsolation.IngressPolicies, ingressPolicy)
}

func (podIsolation *podIsolation) addEgressPolicy(egressPolicy networkingv1.NetworkPolicy) {
	podIsolation.EgressPolicies = append(podIsolation.EgressPolicies, egressPolicy)
}

func NewPodIsolation(pod corev1.Pod) *podIsolation {
	return &podIsolation{
		Pod:             pod,
		IngressPolicies: make([]networkingv1.NetworkPolicy, 0),
		EgressPolicies:  make([]networkingv1.NetworkPolicy, 0),
	}
}
