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

func AnalyzeEverySeconds(kubernetesConfigPath string, resultsChannel chan<- types.AnalysisResult, intervalSeconds time.Duration) {
	kubernetesClient := getKubernetesClient(kubernetesConfigPath)
	for {
		pods := getPodsAllNamespaces(kubernetesClient)
		policies := getNetworkPoliciesAllNamespaces(kubernetesClient)
		namespaces := getNamespaces(kubernetesClient)
		podIsolations := computePodIsolations(pods, policies)
		allowedTraffics := computeAllowedTraffics(podIsolations, namespaces.Items)
		fmt.Printf("Finished analysis, found %d pods and %d allowed traffics\n", len(podIsolations), len(allowedTraffics))
		resultsChannel <- types.AnalysisResult{
			PodIsolations:   podIsolations,
			AllowedTraffics: allowedTraffics,
		}
		time.Sleep(intervalSeconds * time.Second)
	}
}

func getKubernetesClient(kubernetesClientConfig string) *kubernetes.Clientset {
	config, err := clientcmd.BuildConfigFromFlags("", kubernetesClientConfig)
	if err != nil {
		panic(err.Error())
	}
	kubernetesClient, err := kubernetes.NewForConfig(config)
	if err != nil {
		panic(err.Error())
	}
	return kubernetesClient
}

func getPodsAllNamespaces(kubernetesClient *kubernetes.Clientset) *corev1.PodList {
	pods, err := kubernetesClient.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		panic(err.Error())
	}
	return pods
}

func getNetworkPoliciesAllNamespaces(kubernetesClient *kubernetes.Clientset) *networkingv1.NetworkPolicyList {
	policies, err := kubernetesClient.NetworkingV1().NetworkPolicies("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		panic(err.Error())
	}
	return policies
}

func getNamespaces(kubernetesClient *kubernetes.Clientset) *corev1.NamespaceList {
	namespaces, err := kubernetesClient.CoreV1().Namespaces().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		panic(err.Error())
	}
	return namespaces
}

func computePodIsolations(pods *corev1.PodList, policies *networkingv1.NetworkPolicyList) []types.PodIsolation {
	podIsolations := make([]types.PodIsolation, 0)
	for _, pod := range pods.Items {
		podIsolation := computePodIsolation(&pod, policies)
		podIsolations = append(podIsolations, *podIsolation)
	}
	return podIsolations
}

func computePodIsolation(pod *corev1.Pod, policies *networkingv1.NetworkPolicyList) *types.PodIsolation {
	podIsolation := types.NewPodIsolation(*pod)
	for _, policy := range policies.Items {
		namespaceMatches := namespaceMatches(pod, &policy)
		selectorMatches := selectorMatches(pod.Labels, &policy.Spec.PodSelector)
		if namespaceMatches && selectorMatches {
			isIngress, isEgress := policyTypes(&policy)
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

func computeAllowedTraffics(podIsolations []types.PodIsolation, namespaces []corev1.Namespace) []types.AllowedTraffic {
	allowedTraffics := make([]types.AllowedTraffic, 0)
	for i, sourcePodIsolation := range podIsolations {
		for j, targetPodIsolation := range podIsolations {
			if i == j {
				// Ignore traffic to itself
				continue
			}
			allowedTraffic := computeAllowedTraffic(&sourcePodIsolation, &targetPodIsolation, namespaces)
			if allowedTraffic != nil {
				allowedTraffics = append(allowedTraffics, *allowedTraffic)
			}
		}
	}
	return allowedTraffics
}

func computeAllowedTraffic(sourcePodIsolation *types.PodIsolation, targetPodIsolation *types.PodIsolation, namespaces []corev1.Namespace) *types.AllowedTraffic {
	sourceAllowsEgress := !sourcePodIsolation.IsEgressIsolated() ||
		anyPolicyAllowsEgress(&targetPodIsolation.Pod, sourcePodIsolation, namespaces)
	targetAllowsIngress := !targetPodIsolation.IsIngressIsolated() ||
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

func anyPolicyAllowsIngress(sourcePod *corev1.Pod, targetPodIsolation *types.PodIsolation, namespaces []corev1.Namespace) bool {
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

func anyPolicyAllowsEgress(targetPod *corev1.Pod, sourcePodIsolation *types.PodIsolation, namespaces []corev1.Namespace) bool {
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
