package trafficanalyzer

import (
	"context"
	"fmt"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/client-go/kubernetes"
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	"k8s.io/client-go/tools/clientcmd"
	"network-policy-explorer/types"
	"time"
)

type podIsolation struct {
	Pod             corev1.Pod `json:"pod"`
	IngressPolicies []networkingv1.NetworkPolicy
	EgressPolicies  []networkingv1.NetworkPolicy
}

func (podIsolation *podIsolation) IsIngressIsolated() bool {
	return len(podIsolation.IngressPolicies) != 0
}

func (podIsolation *podIsolation) IsEgressIsolated() bool {
	return len(podIsolation.EgressPolicies) != 0
}

func (podIsolation *podIsolation) AddIngressPolicy(ingressPolicy networkingv1.NetworkPolicy) {
	podIsolation.IngressPolicies = append(podIsolation.IngressPolicies, ingressPolicy)
}

func (podIsolation *podIsolation) AddEgressPolicy(egressPolicy networkingv1.NetworkPolicy) {
	podIsolation.EgressPolicies = append(podIsolation.EgressPolicies, egressPolicy)
}

func newPodIsolation(pod corev1.Pod) podIsolation {
	return podIsolation{
		Pod:             pod,
		IngressPolicies: make([]networkingv1.NetworkPolicy, 0),
		EgressPolicies:  make([]networkingv1.NetworkPolicy, 0),
	}
}

func AnalyzeEverySeconds(k8sConfigPath string, resultsChannel chan<- types.AnalysisResult, intervalSeconds time.Duration) {
	k8sClient := getK8sClient(k8sConfigPath)
	for {
		pods := getPodsAllNamespaces(k8sClient)
		policies := getNetworkPoliciesAllNamespaces(k8sClient)
		namespaces := getNamespaces(k8sClient)
		podIsolations := computePodIsolations(pods, policies)
		allowedRoutes := computeAllowedRoutes(podIsolations, namespaces.Items)
		fmt.Printf("Finished analysis, found %d pods and %d allowed pod-to-pod routes\n", len(podIsolations), len(allowedRoutes))
		resultsChannel <- types.AnalysisResult{
			Pods:          fromK8sPodIsolations(podIsolations),
			AllowedRoutes: allowedRoutes,
		}
		time.Sleep(intervalSeconds * time.Second)
	}
}

func getK8sClient(k8sClientConfig string) *kubernetes.Clientset {
	config, err := clientcmd.BuildConfigFromFlags("", k8sClientConfig)
	if err != nil {
		panic(err.Error())
	}
	k8sClient, err := kubernetes.NewForConfig(config)
	if err != nil {
		panic(err.Error())
	}
	return k8sClient
}

func getPodsAllNamespaces(k8sClient *kubernetes.Clientset) corev1.PodList {
	pods, err := k8sClient.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		panic(err.Error())
	}
	return *pods
}

func getNetworkPoliciesAllNamespaces(k8sClient *kubernetes.Clientset) networkingv1.NetworkPolicyList {
	policies, err := k8sClient.NetworkingV1().NetworkPolicies("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		panic(err.Error())
	}
	return *policies
}

func getNamespaces(k8sClient *kubernetes.Clientset) corev1.NamespaceList {
	namespaces, err := k8sClient.CoreV1().Namespaces().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		panic(err.Error())
	}
	return *namespaces
}

func computePodIsolations(pods corev1.PodList, policies networkingv1.NetworkPolicyList) []podIsolation {
	podIsolations := make([]podIsolation, 0)
	for _, pod := range pods.Items {
		podIsolation := computePodIsolation(pod, policies)
		podIsolations = append(podIsolations, podIsolation)
	}
	return podIsolations
}

func computePodIsolation(pod corev1.Pod, policies networkingv1.NetworkPolicyList) podIsolation {
	podIsolation := newPodIsolation(pod)
	for _, policy := range policies.Items {
		namespaceMatches := namespaceMatches(pod, policy)
		selectorMatches := selectorMatches(pod.Labels, policy.Spec.PodSelector)
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

func policyTypes(policy networkingv1.NetworkPolicy) (bool, bool) {
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

func computeAllowedRoutes(podIsolations []podIsolation, namespaces []corev1.Namespace) []types.AllowedRoute {
	allowedRoutes := make([]types.AllowedRoute, 0)
	for i, sourcePodIsolation := range podIsolations {
		for j, targetPodIsolation := range podIsolations {
			if i == j {
				// Ignore traffic to itself
				continue
			}
			allowedRoute := computeAllowedRoute(sourcePodIsolation, targetPodIsolation, namespaces)
			if allowedRoute != nil {
				allowedRoutes = append(allowedRoutes, *allowedRoute)
			}
		}
	}
	return allowedRoutes
}

func computeAllowedRoute(sourcePodIsolation podIsolation, targetPodIsolation podIsolation, namespaces []corev1.Namespace) *types.AllowedRoute {
	egressPolicies := policiesAllowingEgress(targetPodIsolation.Pod, sourcePodIsolation, namespaces)
	sourceAllowsEgress := !sourcePodIsolation.IsEgressIsolated() || len(egressPolicies) > 0
	ingressPolicies := policiesAllowingIngress(sourcePodIsolation.Pod, targetPodIsolation, namespaces)
	targetAllowsIngress := !targetPodIsolation.IsIngressIsolated() || len(ingressPolicies) > 0
	if sourceAllowsEgress && targetAllowsIngress {
		return &types.AllowedRoute{
			SourcePod:       fromK8sPodIsolation(sourcePodIsolation),
			EgressPolicies:  fromK8sNetworkPolicies(egressPolicies),
			TargetPod:       fromK8sPodIsolation(targetPodIsolation),
			IngressPolicies: fromK8sNetworkPolicies(ingressPolicies),
		}
	} else {
		return nil
	}
}

func policiesAllowingIngress(sourcePod corev1.Pod, targetPodIsolation podIsolation, namespaces []corev1.Namespace) []networkingv1.NetworkPolicy {
	policies := make([]networkingv1.NetworkPolicy, 0)
	for _, ingressPolicy := range targetPodIsolation.IngressPolicies {
		if policyAllowsIngress(sourcePod, ingressPolicy, namespaces) {
			policies = append(policies, ingressPolicy)
		}
	}
	return policies
}

func policyAllowsIngress(sourcePod corev1.Pod, ingressPolicy networkingv1.NetworkPolicy, namespaces []corev1.Namespace) bool {
	for _, ingressRule := range ingressPolicy.Spec.Ingress {
		if ingressRuleAllows(sourcePod, ingressRule, namespaces) {
			return true
		}
	}
	return false
}

func ingressRuleAllows(sourcePod corev1.Pod, ingressRule networkingv1.NetworkPolicyIngressRule, namespaces []corev1.Namespace) bool {
	for _, policyPeer := range ingressRule.From {
		if networkRuleMatches(sourcePod, policyPeer, namespaces) {
			return true
		}
	}
	return false
}

func policiesAllowingEgress(targetPod corev1.Pod, sourcePodIsolation podIsolation, namespaces []corev1.Namespace) []networkingv1.NetworkPolicy {
	policies := make([]networkingv1.NetworkPolicy, 0)
	for _, egressPolicy := range sourcePodIsolation.EgressPolicies {
		if policyAllowsEgress(targetPod, egressPolicy, namespaces) {
			policies = append(policies, egressPolicy)
		}
	}
	return policies
}

func policyAllowsEgress(targetPod corev1.Pod, egressPolicy networkingv1.NetworkPolicy, namespaces []corev1.Namespace) bool {
	for _, egressRule := range egressPolicy.Spec.Egress {
		if egressRuleAllows(targetPod, egressRule, namespaces) {
			return true
		}
	}
	return false
}

func egressRuleAllows(targetPod corev1.Pod, egressRule networkingv1.NetworkPolicyEgressRule, namespaces []corev1.Namespace) bool {
	for _, policyPeer := range egressRule.To {
		if networkRuleMatches(targetPod, policyPeer, namespaces) {
			return true
		}
	}
	return false
}

func networkRuleMatches(pod corev1.Pod, policyPeer networkingv1.NetworkPolicyPeer, namespaces []corev1.Namespace) bool {
	namespaceMatches := policyPeer.NamespaceSelector == nil || namespaceLabelsMatches(pod.Namespace, namespaces, *policyPeer.NamespaceSelector)
	selectorMatches := policyPeer.PodSelector == nil || selectorMatches(pod.Labels, *policyPeer.PodSelector)
	return selectorMatches && namespaceMatches
}

func namespaceLabelsMatches(namespaceName string, namespaces []corev1.Namespace, selector metav1.LabelSelector) bool {
	var namespace corev1.Namespace
	for _, candidateNamespace := range namespaces {
		if candidateNamespace.Name == namespaceName {
			namespace = candidateNamespace
			break
		}
	}
	return selectorMatches(namespace.Labels, selector)
}

func namespaceMatches(pod corev1.Pod, policy networkingv1.NetworkPolicy) bool {
	return pod.Namespace == policy.Namespace
}

func selectorMatches(objectLabels map[string]string, labelSelector metav1.LabelSelector) bool {
	selector, err := metav1.LabelSelectorAsSelector(&labelSelector)
	if err != nil {
		fmt.Printf("Could not parse LabelSelector %v\n", labelSelector)
		return false
	}
	return selector.Matches(labels.Set(objectLabels))
}

func fromK8sPodIsolation(podIsolation podIsolation) types.Pod {
	return types.Pod{
		Name:              podIsolation.Pod.Name,
		Namespace:         podIsolation.Pod.Namespace,
		Labels:            podIsolation.Pod.Labels,
		IsIngressIsolated: podIsolation.IsIngressIsolated(),
		IsEgressIsolated:  podIsolation.IsEgressIsolated(),
	}
}

func fromK8sPodIsolations(podIsolations []podIsolation) []types.Pod {
	result := make([]types.Pod, 0)
	for _, podIsolation := range podIsolations {
		result = append(result, fromK8sPodIsolation(podIsolation))
	}
	return result
}

func fromK8sNetworkPolicy(networkPolicy networkingv1.NetworkPolicy) types.NetworkPolicy {
	return types.NetworkPolicy{
		Name:      networkPolicy.Name,
		Namespace: networkPolicy.Namespace,
		Labels:    networkPolicy.Labels,
	}
}

func fromK8sNetworkPolicies(networkPolicies []networkingv1.NetworkPolicy) []types.NetworkPolicy {
	result := make([]types.NetworkPolicy, 0)
	for _, networkPolicy := range networkPolicies {
		result = append(result, fromK8sNetworkPolicy(networkPolicy))
	}
	return result
}
