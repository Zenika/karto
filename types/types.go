package types

import (
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
)

type AllowedTraffic struct {
	From            corev1.Pod
	EgressPolicies  []networkingv1.NetworkPolicy
	To              corev1.Pod
	IngressPolicies []networkingv1.NetworkPolicy
}
