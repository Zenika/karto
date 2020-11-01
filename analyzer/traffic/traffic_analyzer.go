package traffic

import (
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"karto/analyzer/utils"
	"karto/types"
	"sort"
)

var portWildcard int32 = -1

type podIsolation struct {
	Pod             *corev1.Pod
	IngressPolicies []*networkingv1.NetworkPolicy
	EgressPolicies  []*networkingv1.NetworkPolicy
}

func (podIsolation *podIsolation) IsIngressIsolated() bool {
	return len(podIsolation.IngressPolicies) != 0
}

func (podIsolation *podIsolation) IsEgressIsolated() bool {
	return len(podIsolation.EgressPolicies) != 0
}

func (podIsolation *podIsolation) AddIngressPolicy(ingressPolicy *networkingv1.NetworkPolicy) {
	podIsolation.IngressPolicies = append(podIsolation.IngressPolicies, ingressPolicy)
}

func (podIsolation *podIsolation) AddEgressPolicy(egressPolicy *networkingv1.NetworkPolicy) {
	podIsolation.EgressPolicies = append(podIsolation.EgressPolicies, egressPolicy)
}

func newPodIsolation(pod *corev1.Pod) podIsolation {
	return podIsolation{
		Pod:             pod,
		IngressPolicies: make([]*networkingv1.NetworkPolicy, 0),
		EgressPolicies:  make([]*networkingv1.NetworkPolicy, 0),
	}
}

func Analyze(pods []*corev1.Pod, namespaces []*corev1.Namespace, networkPolicies []*networkingv1.NetworkPolicy) ([]types.PodIsolation, []types.AllowedRoute) {
	podIsolations := podIsolationsOfAllPods(pods, networkPolicies)
	allowedRoutes := allowedRoutesOfAllPods(podIsolations, namespaces)
	return toPodIsolations(podIsolations), allowedRoutes
}

func podIsolationsOfAllPods(pods []*corev1.Pod, policies []*networkingv1.NetworkPolicy) []podIsolation {
	podIsolations := make([]podIsolation, 0)
	for _, pod := range pods {
		podIsolation := podIsolationOf(pod, policies)
		podIsolations = append(podIsolations, podIsolation)
	}
	return podIsolations
}

func podIsolationOf(pod *corev1.Pod, policies []*networkingv1.NetworkPolicy) podIsolation {
	podIsolation := newPodIsolation(pod)
	for _, policy := range policies {
		namespaceMatches := networkPolicyNamespaceMatches(pod, policy)
		selectorMatches := utils.SelectorMatches(pod.Labels, policy.Spec.PodSelector)
		if namespaceMatches && selectorMatches {
			isIngress, isEgress := policyTypes(policy)
			if isIngress {
				podIsolation.AddIngressPolicy(policy)
			}
			if isEgress {
				podIsolation.AddEgressPolicy(policy)
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

func allowedRoutesOfAllPods(podIsolations []podIsolation, namespaces []*corev1.Namespace) []types.AllowedRoute {
	allowedRoutes := make([]types.AllowedRoute, 0)
	for i, sourcePodIsolation := range podIsolations {
		for j, targetPodIsolation := range podIsolations {
			if i == j {
				// Ignore traffic to itself
				continue
			}
			allowedRoute := allowedRouteBetween(sourcePodIsolation, targetPodIsolation, namespaces)
			if allowedRoute != nil {
				allowedRoutes = append(allowedRoutes, *allowedRoute)
			}
		}
	}
	return allowedRoutes
}

func allowedRouteBetween(sourcePodIsolation podIsolation, targetPodIsolation podIsolation, namespaces []*corev1.Namespace) *types.AllowedRoute {
	ingressPoliciesByPort := ingressPoliciesByPort(sourcePodIsolation.Pod, targetPodIsolation, namespaces)
	egressPoliciesByPort := egressPoliciesByPort(targetPodIsolation.Pod, sourcePodIsolation, namespaces)
	ports, ingressPolicies, egressPolicies := matchPoliciesByPort(ingressPoliciesByPort, egressPoliciesByPort)
	if ports == nil || len(ports) > 0 {
		return &types.AllowedRoute{
			SourcePod:       toPodRef(sourcePodIsolation),
			EgressPolicies:  toNetworkPolicies(egressPolicies),
			TargetPod:       toPodRef(targetPodIsolation),
			IngressPolicies: toNetworkPolicies(ingressPolicies),
			Ports:           ports,
		}
	} else {
		return nil
	}
}

func ingressPoliciesByPort(sourcePod *corev1.Pod, targetPodIsolation podIsolation, namespaces []*corev1.Namespace) map[int32][]*networkingv1.NetworkPolicy {
	policiesByPort := make(map[int32][]*networkingv1.NetworkPolicy)
	if !targetPodIsolation.IsIngressIsolated() {
		policiesByPort[portWildcard] = make([]*networkingv1.NetworkPolicy, 0)
	} else {
		for i, ingressPolicy := range targetPodIsolation.IngressPolicies {
			for _, ingressRule := range ingressPolicy.Spec.Ingress {
				if ingressRuleAllows(sourcePod, ingressRule, namespaces) {
					if len(ingressRule.Ports) == 0 {
						policies := policiesByPort[portWildcard]
						if policies == nil {
							policies = make([]*networkingv1.NetworkPolicy, 0)
						}
						policies = append(policies, targetPodIsolation.IngressPolicies[i])
						policiesByPort[portWildcard] = policies
					} else {
						for _, port := range ingressRule.Ports {
							policies := policiesByPort[port.Port.IntVal]
							if policies == nil {
								policies = make([]*networkingv1.NetworkPolicy, 0)
							}
							policies = append(policies, targetPodIsolation.IngressPolicies[i])
							policiesByPort[port.Port.IntVal] = policies
						}
					}
				}
			}
		}
	}
	return policiesByPort
}

func ingressRuleAllows(sourcePod *corev1.Pod, ingressRule networkingv1.NetworkPolicyIngressRule, namespaces []*corev1.Namespace) bool {
	for _, policyPeer := range ingressRule.From {
		if networkRuleMatches(sourcePod, policyPeer, namespaces) {
			return true
		}
	}
	return false
}

func egressPoliciesByPort(targetPod *corev1.Pod, sourcePodIsolation podIsolation, namespaces []*corev1.Namespace) map[int32][]*networkingv1.NetworkPolicy {
	policiesByPort := make(map[int32][]*networkingv1.NetworkPolicy)
	if !sourcePodIsolation.IsEgressIsolated() {
		policiesByPort[portWildcard] = make([]*networkingv1.NetworkPolicy, 0)
	} else {
		for i, egressPolicy := range sourcePodIsolation.EgressPolicies {
			for _, egressRule := range egressPolicy.Spec.Egress {
				if egressRuleAllows(targetPod, egressRule, namespaces) {
					if len(egressRule.Ports) == 0 {
						policies := policiesByPort[portWildcard]
						if policies == nil {
							policies = make([]*networkingv1.NetworkPolicy, 0)
						}
						policies = append(policies, sourcePodIsolation.EgressPolicies[i])
						policiesByPort[portWildcard] = policies
					} else {
						for _, port := range egressRule.Ports {
							policies := policiesByPort[port.Port.IntVal]
							if policies == nil {
								policies = make([]*networkingv1.NetworkPolicy, 0)
							}
							policies = append(policies, sourcePodIsolation.EgressPolicies[i])
							policiesByPort[port.Port.IntVal] = policies
						}
					}
				}
			}
		}
	}
	return policiesByPort
}

func egressRuleAllows(targetPod *corev1.Pod, egressRule networkingv1.NetworkPolicyEgressRule, namespaces []*corev1.Namespace) bool {
	for _, policyPeer := range egressRule.To {
		if networkRuleMatches(targetPod, policyPeer, namespaces) {
			return true
		}
	}
	return false
}

func matchPoliciesByPort(ingressPoliciesByPort map[int32][]*networkingv1.NetworkPolicy, egressPoliciesByPort map[int32][]*networkingv1.NetworkPolicy) ([]int32, []*networkingv1.NetworkPolicy, []*networkingv1.NetworkPolicy) {
	portsSet := make(map[int32]bool)
	ingressPoliciesSet := make(map[*networkingv1.NetworkPolicy]bool)
	egressPoliciesSet := make(map[*networkingv1.NetworkPolicy]bool)
	for ingressPort, ingressPolicies := range ingressPoliciesByPort {
		for egressPort, egressPolicies := range egressPoliciesByPort {
			if ingressPort == portWildcard || egressPort == portWildcard || ingressPort == egressPort {
				if ingressPort == portWildcard {
					portsSet[egressPort] = true
				} else {
					portsSet[ingressPort] = true
				}
				for _, egressPolicy := range egressPolicies {
					egressPoliciesSet[egressPolicy] = true
				}
				for _, ingressPolicy := range ingressPolicies {
					ingressPoliciesSet[ingressPolicy] = true
				}
			}
		}
	}
	if portsSet[portWildcard] {
		portsSet = nil
	}
	var ports []int32
	if portsSet != nil {
		ports = make([]int32, 0, len(portsSet))
		for port := range portsSet {
			ports = append(ports, port)
		}
		sort.Slice(ports, func(i, j int) bool { return ports[i] < ports[j] })
	}
	ingressPolicies := make([]*networkingv1.NetworkPolicy, 0)
	for ingressPolicy := range ingressPoliciesSet {
		ingressPolicies = append(ingressPolicies, ingressPolicy)
	}
	egressPolicies := make([]*networkingv1.NetworkPolicy, 0)
	for egressPolicy := range egressPoliciesSet {
		egressPolicies = append(egressPolicies, egressPolicy)
	}
	return ports, ingressPolicies, egressPolicies
}

func networkRuleMatches(pod *corev1.Pod, policyPeer networkingv1.NetworkPolicyPeer, namespaces []*corev1.Namespace) bool {
	namespaceMatches := policyPeer.NamespaceSelector == nil || namespaceLabelsMatches(pod.Namespace, namespaces, *policyPeer.NamespaceSelector)
	selectorMatches := policyPeer.PodSelector == nil || utils.SelectorMatches(pod.Labels, *policyPeer.PodSelector)
	return selectorMatches && namespaceMatches
}

func namespaceLabelsMatches(namespaceName string, namespaces []*corev1.Namespace, selector metav1.LabelSelector) bool {
	var namespace corev1.Namespace
	for _, candidateNamespace := range namespaces {
		if candidateNamespace.Name == namespaceName {
			namespace = *candidateNamespace
			break
		}
	}
	return utils.SelectorMatches(namespace.Labels, selector)
}

func networkPolicyNamespaceMatches(pod *corev1.Pod, policy *networkingv1.NetworkPolicy) bool {
	return pod.Namespace == policy.Namespace
}

func toPodIsolations(podIsolations []podIsolation) []types.PodIsolation {
	result := make([]types.PodIsolation, 0)
	for _, podIsolation := range podIsolations {
		result = append(result, toPodIsolation(podIsolation))
	}
	return result
}

func toPodIsolation(podIsolation podIsolation) types.PodIsolation {
	return types.PodIsolation{
		Pod:               toPodRef(podIsolation),
		IsIngressIsolated: podIsolation.IsIngressIsolated(),
		IsEgressIsolated:  podIsolation.IsEgressIsolated(),
	}
}

func toPodRef(podIsolation podIsolation) types.PodRef {
	return types.PodRef{
		Name:      podIsolation.Pod.Name,
		Namespace: podIsolation.Pod.Namespace,
	}
}

func toNetworkPolicies(networkPolicies []*networkingv1.NetworkPolicy) []types.NetworkPolicy {
	result := make([]types.NetworkPolicy, 0)
	for _, networkPolicy := range networkPolicies {
		result = append(result, toNetworkPolicy(*networkPolicy))
	}
	return result
}

func toNetworkPolicy(networkPolicy networkingv1.NetworkPolicy) types.NetworkPolicy {
	return types.NetworkPolicy{
		Name:      networkPolicy.Name,
		Namespace: networkPolicy.Namespace,
		Labels:    networkPolicy.Labels,
	}
}
