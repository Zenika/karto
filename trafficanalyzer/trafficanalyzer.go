package trafficanalyzer

import (
	"fmt"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"network-policy-explorer/types"
)

func Analyze(pods *corev1.PodList, policies *networkingv1.NetworkPolicyList, namespaces *corev1.NamespaceList) []types.AllowedTraffic {
	podIsolations := computePodIsolations(pods, policies)
	return computeAllowedCommunications(podIsolations, namespaces.Items)
}

func computePodIsolations(pods *corev1.PodList, policies *networkingv1.NetworkPolicyList) []podIsolation {
	podIsolations := make([]podIsolation, 0)
	for _, pod := range pods.Items {
		podIsolation := computePodIsolation(&pod, policies)
		podIsolations = append(podIsolations, *podIsolation)
	}
	return podIsolations
}

func computePodIsolation(pod *corev1.Pod, policies *networkingv1.NetworkPolicyList) *podIsolation {
	podIsolation := NewPodIsolation(*pod)
	for _, policy := range policies.Items {
		namespaceMatches := namespaceMatches(pod, &policy)
		selectorMatches := selectorMatches(pod.Labels, &policy.Spec.PodSelector)
		if namespaceMatches && selectorMatches {
			isIngress, isEgress := policyTypes(&policy)
			if isIngress {
				podIsolation.addIngressPolicy(policy)
			}
			if isEgress {
				podIsolation.addEgressPolicy(policy)
			}
		}
	}
	return podIsolation
}

func policyTypes(policy *networkingv1.NetworkPolicy) (bool, bool) {
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

func computeAllowedCommunications(podIsolations []podIsolation, namespaces []corev1.Namespace) []types.AllowedTraffic {
	allowedCommunications := make([]types.AllowedTraffic, 0)
	for i, sourcePodIsolation := range podIsolations {
		for j, targetPodIsolation := range podIsolations {
			if i == j {
				// Ignore communication to itself
				continue
			}
			allowedCommunication := computeAllowedCommunication(&sourcePodIsolation, &targetPodIsolation, namespaces)
			if allowedCommunication != nil {
				allowedCommunications = append(allowedCommunications, *allowedCommunication)
			}
		}
	}
	return allowedCommunications
}

func computeAllowedCommunication(sourcePodIsolation *podIsolation, targetPodIsolation *podIsolation, namespaces []corev1.Namespace) *types.AllowedTraffic {
	sourceAllowsEgress := !sourcePodIsolation.isEgressIsolated() ||
		anyPolicyAllowsEgress(&targetPodIsolation.Pod, sourcePodIsolation, namespaces)
	targetAllowsIngress := !targetPodIsolation.isIngressIsolated() ||
		anyPolicyAllowsIngress(&sourcePodIsolation.Pod, targetPodIsolation, namespaces)
	if sourceAllowsEgress && targetAllowsIngress {
		return &types.AllowedTraffic{
			From:            sourcePodIsolation.Pod,
			EgressPolicies:  nil,
			To:              targetPodIsolation.Pod,
			IngressPolicies: nil,
		}
	} else {
		return nil
	}
}

func anyPolicyAllowsIngress(sourcePod *corev1.Pod, targetPodIsolation *podIsolation, namespaces []corev1.Namespace) bool {
	for _, ingressPolicy := range targetPodIsolation.IngressPolicies {
		if policyAllowsIngress(sourcePod, ingressPolicy, namespaces) {
			return true
		}
	}
	return false
}

func policyAllowsIngress(sourcePod *corev1.Pod, ingressPolicy networkingv1.NetworkPolicy, namespaces []corev1.Namespace) bool {
	for _, ingressRule := range ingressPolicy.Spec.Ingress {
		if ingressRuleAllows(sourcePod, &ingressRule, namespaces) {
			return true
		}
	}
	return false
}

func ingressRuleAllows(sourcePod *corev1.Pod, ingressRule *networkingv1.NetworkPolicyIngressRule, namespaces []corev1.Namespace) bool {
	for _, policyPeer := range ingressRule.From {
		if networkRuleMatches(sourcePod, &policyPeer, namespaces) {
			return true
		}
	}
	return false
}

func anyPolicyAllowsEgress(targetPod *corev1.Pod, sourcePodIsolation *podIsolation, namespaces []corev1.Namespace) bool {
	for _, egressPolicy := range sourcePodIsolation.EgressPolicies {
		if policyAllowsEgress(targetPod, egressPolicy, namespaces) {
			return true
		}
	}
	return false
}

func policyAllowsEgress(targetPod *corev1.Pod, egressPolicy networkingv1.NetworkPolicy, namespaces []corev1.Namespace) bool {
	for _, egressRule := range egressPolicy.Spec.Egress {
		if egressRuleAllows(targetPod, &egressRule, namespaces) {
			return true
		}
	}
	return false
}

func egressRuleAllows(targetPod *corev1.Pod, egressRule *networkingv1.NetworkPolicyEgressRule, namespaces []corev1.Namespace) bool {
	for _, policyPeer := range egressRule.To {
		if networkRuleMatches(targetPod, &policyPeer, namespaces) {
			return true
		}
	}
	return false
}

func networkRuleMatches(pod *corev1.Pod, policyPeer *networkingv1.NetworkPolicyPeer, namespaces []corev1.Namespace) bool {
	namespaceMatches := policyPeer.NamespaceSelector == nil || namespaceLabelsMatches(pod.Namespace, namespaces, policyPeer.NamespaceSelector)
	selectorMatches := policyPeer.PodSelector == nil || selectorMatches(pod.Labels, policyPeer.PodSelector)
	return selectorMatches && namespaceMatches
}

func namespaceLabelsMatches(namespaceName string, namespaces []corev1.Namespace, selector *metav1.LabelSelector) bool {
	var namespace corev1.Namespace
	for _, candidateNamespace := range namespaces {
		if candidateNamespace.Name == namespaceName {
			namespace = candidateNamespace
			break
		}
	}
	return selectorMatches(namespace.Labels, selector)
}

func namespaceMatches(pod *corev1.Pod, policy *networkingv1.NetworkPolicy) bool {
	return pod.Namespace == policy.Namespace
}

func selectorMatches(objectLabels map[string]string, labelSelector *metav1.LabelSelector) bool {
	selector, err := metav1.LabelSelectorAsSelector(labelSelector)
	if err != nil {
		fmt.Printf("Could not parse LabelSelector %v\n", labelSelector)
		return false
	}
	return selector.Matches(labels.Set(objectLabels))
}
