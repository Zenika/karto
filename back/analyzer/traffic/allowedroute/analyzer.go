package allowedroute

import (
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"karto/analyzer/traffic/shared"
	"karto/analyzer/utils"
	"karto/types"
	"sort"
)

const portWildcard = -1

type Analyzer interface {
	Analyze(sourcePodIsolation *shared.PodIsolation, targetPodIsolation *shared.PodIsolation,
		namespaces []*corev1.Namespace) *types.AllowedRoute
}

type analyzerImpl struct {
}

func NewAnalyzer() Analyzer {
	return analyzerImpl{}
}

func (analyzer analyzerImpl) Analyze(sourcePodIsolation *shared.PodIsolation, targetPodIsolation *shared.PodIsolation,
	namespaces []*corev1.Namespace) *types.AllowedRoute {
	ingressPoliciesByPort := analyzer.ingressPoliciesByPort(sourcePodIsolation.Pod, targetPodIsolation, namespaces)
	egressPoliciesByPort := analyzer.egressPoliciesByPort(targetPodIsolation.Pod, sourcePodIsolation, namespaces)
	ports, ingressPolicies, egressPolicies := analyzer.matchPoliciesByPort(ingressPoliciesByPort, egressPoliciesByPort)
	if ports == nil || len(ports) > 0 {
		return &types.AllowedRoute{
			SourcePod:       analyzer.toPodRef(sourcePodIsolation),
			EgressPolicies:  analyzer.toNetworkPolicies(egressPolicies),
			TargetPod:       analyzer.toPodRef(targetPodIsolation),
			IngressPolicies: analyzer.toNetworkPolicies(ingressPolicies),
			Ports:           ports,
		}
	} else {
		return nil
	}
}

func (analyzer analyzerImpl) ingressPoliciesByPort(sourcePod *corev1.Pod, targetPodIsolation *shared.PodIsolation,
	namespaces []*corev1.Namespace) map[int32][]*networkingv1.NetworkPolicy {
	policiesByPort := make(map[int32][]*networkingv1.NetworkPolicy)
	if !targetPodIsolation.IsIngressIsolated() {
		policiesByPort[portWildcard] = make([]*networkingv1.NetworkPolicy, 0)
	} else {
		for i, ingressPolicy := range targetPodIsolation.IngressPolicies {
			for _, ingressRule := range ingressPolicy.Spec.Ingress {
				if analyzer.ingressRuleAllows(sourcePod, ingressRule, namespaces) {
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

func (analyzer analyzerImpl) ingressRuleAllows(sourcePod *corev1.Pod, ingressRule networkingv1.NetworkPolicyIngressRule,
	namespaces []*corev1.Namespace) bool {
	for _, policyPeer := range ingressRule.From {
		if analyzer.networkRuleMatches(sourcePod, policyPeer, namespaces) {
			return true
		}
	}
	return false
}

func (analyzer analyzerImpl) egressPoliciesByPort(targetPod *corev1.Pod, sourcePodIsolation *shared.PodIsolation,
	namespaces []*corev1.Namespace) map[int32][]*networkingv1.NetworkPolicy {
	policiesByPort := make(map[int32][]*networkingv1.NetworkPolicy)
	if !sourcePodIsolation.IsEgressIsolated() {
		policiesByPort[portWildcard] = make([]*networkingv1.NetworkPolicy, 0)
	} else {
		for i, egressPolicy := range sourcePodIsolation.EgressPolicies {
			for _, egressRule := range egressPolicy.Spec.Egress {
				if analyzer.egressRuleAllows(targetPod, egressRule, namespaces) {
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

func (analyzer analyzerImpl) egressRuleAllows(targetPod *corev1.Pod, egressRule networkingv1.NetworkPolicyEgressRule,
	namespaces []*corev1.Namespace) bool {
	for _, policyPeer := range egressRule.To {
		if analyzer.networkRuleMatches(targetPod, policyPeer, namespaces) {
			return true
		}
	}
	return false
}

func (analyzer analyzerImpl) matchPoliciesByPort(ingressPoliciesByPort map[int32][]*networkingv1.NetworkPolicy,
	egressPoliciesByPort map[int32][]*networkingv1.NetworkPolicy) ([]int32, []*networkingv1.NetworkPolicy,
	[]*networkingv1.NetworkPolicy) {
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

func (analyzer analyzerImpl) networkRuleMatches(pod *corev1.Pod, policyPeer networkingv1.NetworkPolicyPeer,
	namespaces []*corev1.Namespace) bool {
	namespaceMatches := policyPeer.NamespaceSelector == nil ||
		analyzer.namespaceLabelsMatches(pod.Namespace, namespaces, *policyPeer.NamespaceSelector)
	selectorMatches := policyPeer.PodSelector == nil || utils.SelectorMatches(pod.Labels, *policyPeer.PodSelector)
	return selectorMatches && namespaceMatches
}

func (analyzer analyzerImpl) namespaceLabelsMatches(namespaceName string, namespaces []*corev1.Namespace,
	selector metav1.LabelSelector) bool {
	var namespace corev1.Namespace
	for _, candidateNamespace := range namespaces {
		if candidateNamespace.Name == namespaceName {
			namespace = *candidateNamespace
			break
		}
	}
	return utils.SelectorMatches(namespace.Labels, selector)
}

func (analyzer analyzerImpl) toPodRef(podIsolation *shared.PodIsolation) types.PodRef {
	return types.PodRef{
		Name:      podIsolation.Pod.Name,
		Namespace: podIsolation.Pod.Namespace,
	}
}

func (analyzer analyzerImpl) toNetworkPolicies(networkPolicies []*networkingv1.NetworkPolicy) []types.NetworkPolicy {
	result := make([]types.NetworkPolicy, 0)
	for _, networkPolicy := range networkPolicies {
		result = append(result, analyzer.toNetworkPolicy(networkPolicy))
	}
	return result
}

func (analyzer analyzerImpl) toNetworkPolicy(networkPolicy *networkingv1.NetworkPolicy) types.NetworkPolicy {
	return types.NetworkPolicy{
		Name:      networkPolicy.Name,
		Namespace: networkPolicy.Namespace,
		Labels:    networkPolicy.Labels,
	}
}
