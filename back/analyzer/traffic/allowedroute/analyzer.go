package allowedroute

import (
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"karto/analyzer/shared"
	"karto/commons"
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

func (analyzer analyzerImpl) Analyze(
	sourcePodIsolation *shared.PodIsolation,
	targetPodIsolation *shared.PodIsolation,
	namespaces []*corev1.Namespace,
) *types.AllowedRoute {
	ingressPoliciesByPort := analyzer.ingressPoliciesByPort(sourcePodIsolation.Pod, targetPodIsolation, namespaces)
	egressPoliciesByPort := analyzer.egressPoliciesByPort(targetPodIsolation.Pod, sourcePodIsolation, namespaces)
	ports, ingressPolicies, egressPolicies := analyzer.matchPoliciesByPort(ingressPoliciesByPort, egressPoliciesByPort)
	if ports == nil || len(ports) > 0 {
		return &types.AllowedRoute{
			SourcePod:       shared.ToPodRef(sourcePodIsolation.Pod),
			EgressPolicies:  commons.Map(egressPolicies, analyzer.toNetworkPolicy),
			TargetPod:       shared.ToPodRef(targetPodIsolation.Pod),
			IngressPolicies: commons.Map(ingressPolicies, analyzer.toNetworkPolicy),
			Ports:           ports,
		}
	} else {
		return nil
	}
}

func (analyzer analyzerImpl) ingressPoliciesByPort(
	sourcePod *corev1.Pod,
	targetPodIsolation *shared.PodIsolation,
	namespaces []*corev1.Namespace,
) *commons.MultiMap[int32, *networkingv1.NetworkPolicy] {
	policiesByPort := commons.NewMultiMap[int32, *networkingv1.NetworkPolicy]()
	if !targetPodIsolation.IsIngressIsolated() {
		policiesByPort.AddKey(portWildcard)
	} else {
		for _, ingressPolicy := range targetPodIsolation.IngressPolicies {
			for _, ingressRule := range ingressPolicy.Spec.Ingress {
				if analyzer.ingressRuleAllows(sourcePod, ingressRule, namespaces) {
					if len(ingressRule.Ports) == 0 {
						policiesByPort.AddMapping(portWildcard, ingressPolicy)
					} else {
						for _, port := range ingressRule.Ports {
							policiesByPort.AddMapping(port.Port.IntVal, ingressPolicy)
						}
					}
				}
			}
		}
	}
	return policiesByPort
}

func (analyzer analyzerImpl) ingressRuleAllows(
	sourcePod *corev1.Pod, ingressRule networkingv1.NetworkPolicyIngressRule,
	namespaces []*corev1.Namespace,
) bool {
	for _, policyPeer := range ingressRule.From {
		if analyzer.networkRuleMatches(sourcePod, policyPeer, namespaces) {
			return true
		}
	}
	return false
}

func (analyzer analyzerImpl) egressPoliciesByPort(
	targetPod *corev1.Pod,
	sourcePodIsolation *shared.PodIsolation,
	namespaces []*corev1.Namespace,
) *commons.MultiMap[int32, *networkingv1.NetworkPolicy] {
	policiesByPort := commons.NewMultiMap[int32, *networkingv1.NetworkPolicy]()
	if !sourcePodIsolation.IsEgressIsolated() {
		policiesByPort.AddKey(portWildcard)
	} else {
		for _, egressPolicy := range sourcePodIsolation.EgressPolicies {
			for _, egressRule := range egressPolicy.Spec.Egress {
				if analyzer.egressRuleAllows(targetPod, egressRule, namespaces) {
					if len(egressRule.Ports) == 0 {
						policiesByPort.AddMapping(portWildcard, egressPolicy)
					} else {
						for _, port := range egressRule.Ports {
							policiesByPort.AddMapping(port.Port.IntVal, egressPolicy)
						}
					}
				}
			}
		}
	}
	return policiesByPort
}

func (analyzer analyzerImpl) egressRuleAllows(
	targetPod *corev1.Pod,
	egressRule networkingv1.NetworkPolicyEgressRule,
	namespaces []*corev1.Namespace,
) bool {
	for _, policyPeer := range egressRule.To {
		if analyzer.networkRuleMatches(targetPod, policyPeer, namespaces) {
			return true
		}
	}
	return false
}

func (analyzer analyzerImpl) matchPoliciesByPort(
	ingressPoliciesByPort *commons.MultiMap[int32, *networkingv1.NetworkPolicy],
	egressPoliciesByPort *commons.MultiMap[int32, *networkingv1.NetworkPolicy],
) (
	[]int32,
	[]*networkingv1.NetworkPolicy,
	[]*networkingv1.NetworkPolicy,
) {
	portsSet := commons.NewSet[int32]()
	ingressPoliciesSet := commons.NewSet[*networkingv1.NetworkPolicy]()
	egressPoliciesSet := commons.NewSet[*networkingv1.NetworkPolicy]()
	for _, portIngressEntry := range ingressPoliciesByPort.Entries() {
		ingressPort := portIngressEntry.Key
		ingressPolicies := portIngressEntry.Value
		for _, portEgressEntry := range egressPoliciesByPort.Entries() {
			egressPort := portEgressEntry.Key
			egressPolicies := portEgressEntry.Value
			if ingressPort == portWildcard || egressPort == portWildcard || ingressPort == egressPort {
				if ingressPort == portWildcard {
					portsSet.Add(egressPort)
				} else {
					portsSet.Add(ingressPort)
				}
				for _, egressPolicy := range egressPolicies {
					egressPoliciesSet.Add(egressPolicy)
				}
				for _, ingressPolicy := range ingressPolicies {
					ingressPoliciesSet.Add(ingressPolicy)
				}
			}
		}
	}
	var ports []int32
	if !portsSet.Contains(portWildcard) {
		ports = portsSet.ToSlice()
		sort.Slice(ports, func(i, j int) bool { return ports[i] < ports[j] })
	}
	return ports, ingressPoliciesSet.ToSlice(), egressPoliciesSet.ToSlice()
}

func (analyzer analyzerImpl) networkRuleMatches(
	pod *corev1.Pod,
	policyPeer networkingv1.NetworkPolicyPeer,
	namespaces []*corev1.Namespace,
) bool {
	namespaceMatches := policyPeer.NamespaceSelector == nil ||
		analyzer.namespaceLabelsMatch(pod.Namespace, namespaces, *policyPeer.NamespaceSelector)
	selectorMatches := policyPeer.PodSelector == nil || shared.SelectorMatches(pod.Labels, *policyPeer.PodSelector)
	return selectorMatches && namespaceMatches
}

func (analyzer analyzerImpl) namespaceLabelsMatch(
	namespaceName string,
	namespaces []*corev1.Namespace,
	selector metav1.LabelSelector,
) bool {
	var namespace corev1.Namespace
	for _, candidateNamespace := range namespaces {
		if candidateNamespace.Name == namespaceName {
			namespace = *candidateNamespace
			break
		}
	}
	return shared.SelectorMatches(namespace.Labels, selector)
}

func (analyzer analyzerImpl) toNetworkPolicy(networkPolicy *networkingv1.NetworkPolicy) types.NetworkPolicy {
	return types.NetworkPolicy{
		Name:      networkPolicy.Name,
		Namespace: networkPolicy.Namespace,
		Labels:    networkPolicy.Labels,
	}
}
