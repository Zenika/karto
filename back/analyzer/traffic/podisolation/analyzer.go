package podisolation

import (
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"karto/analyzer/shared"
)

type Analyzer interface {
	Analyze(pod *corev1.Pod, policies []*networkingv1.NetworkPolicy) *shared.PodIsolation
}

type analyzerImpl struct{}

func NewAnalyzer() Analyzer {
	return analyzerImpl{}
}

func (analyzer analyzerImpl) Analyze(pod *corev1.Pod, policies []*networkingv1.NetworkPolicy) *shared.PodIsolation {
	podIsolation := shared.NewPodIsolation(pod)
	for _, policy := range policies {
		namespaceMatches := analyzer.networkPolicyNamespaceMatches(pod, policy)
		selectorMatches := shared.SelectorMatches(pod.Labels, policy.Spec.PodSelector)
		if namespaceMatches && selectorMatches {
			isIngress, isEgress := analyzer.policyTypes(policy)
			if isIngress {
				podIsolation.AddIngressPolicy(policy)
			}
			if isEgress {
				podIsolation.AddEgressPolicy(policy)
			}
		}
	}
	return &podIsolation
}

func (analyzer analyzerImpl) networkPolicyNamespaceMatches(pod *corev1.Pod, policy *networkingv1.NetworkPolicy) bool {
	return pod.Namespace == policy.Namespace
}

func (analyzer analyzerImpl) policyTypes(policy *networkingv1.NetworkPolicy) (bool, bool) {
	var isIngress, isEgress bool
	for _, policyType := range policy.Spec.PolicyTypes {
		if policyType == "Ingress" {
			isIngress = true
		} else if policyType == "Egress" {
			isEgress = true
		}
	}
	return isIngress, isEgress
}
