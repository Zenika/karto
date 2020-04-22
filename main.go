package main

import (
	"context"
	"flag"
	"fmt"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/client-go/kubernetes"
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	"k8s.io/client-go/tools/clientcmd"
	"os"
	"path/filepath"
)

type PodIsolation struct {
	Pod             corev1.Pod
	IngressPolicies []networkingv1.NetworkPolicy
	EgressPolicies  []networkingv1.NetworkPolicy
}

func NewPodIsolation(pod corev1.Pod) *PodIsolation {
	return &PodIsolation{
		Pod:             pod,
		IngressPolicies: make([]networkingv1.NetworkPolicy, 0),
		EgressPolicies:  make([]networkingv1.NetworkPolicy, 0),
	}
}

func (podIsolation *PodIsolation) isIngressIsolated() bool {
	return len(podIsolation.IngressPolicies) != 0
}

func (podIsolation *PodIsolation) isEgressIsolated() bool {
	return len(podIsolation.EgressPolicies) != 0
}

func (podIsolation *PodIsolation) addIngressPolicy(ingressPolicy networkingv1.NetworkPolicy) {
	podIsolation.IngressPolicies = append(podIsolation.IngressPolicies, ingressPolicy)
}

func (podIsolation *PodIsolation) addEgressPolicy(egressPolicy networkingv1.NetworkPolicy) {
	podIsolation.EgressPolicies = append(podIsolation.EgressPolicies, egressPolicy)
}

type AllowedCommunication struct {
	From            corev1.Pod
	EgressPolicies  []networkingv1.NetworkPolicy
	To              corev1.Pod
	IngressPolicies []networkingv1.NetworkPolicy
}

func main() {
	kubeClient := initialize()

	pods := getPodsAllNamespaces(kubeClient)
	for _, pod := range pods.Items {
		fmt.Printf("Pod: %v:\n", pod.Name)
	}

	policies := getNetworkPoliciesAllNamespaces(kubeClient)
	for _, policy := range policies.Items {
		fmt.Printf("Network Policy: %v:\n", policy.Name)
	}

	namespaces := getNamespaces(kubeClient)
	for _, namespace := range namespaces.Items {
		fmt.Printf("Namespace: %v:\n", namespace.Name)
	}

	podIsolations := computePodIsolations(pods, policies)
	for _, podIsolation := range podIsolations {
		if podIsolation.isIngressIsolated() {
			fmt.Printf("Pod %v ingress isolated\n", podIsolation.Pod.Name)
		} else {
			fmt.Printf("Pod %v not ingress isolated\n", podIsolation.Pod.Name)
		}
	}
	for _, podIsolation := range podIsolations {
		if podIsolation.isEgressIsolated() {
			fmt.Printf("Pod %v egress isolated\n", podIsolation.Pod.Name)
		} else {
			fmt.Printf("Pod %v not egress isolated\n", podIsolation.Pod.Name)
		}
	}

	allowedCommunications := computeAllowedCommunications(podIsolations, namespaces.Items)
	for _, allowedCommunication := range allowedCommunications {
		fmt.Printf("Allowed communication: %v -> %v\n", allowedCommunication.From.Name, allowedCommunication.To.Name)
	}
}

func initialize() *kubernetes.Clientset {
	home := os.Getenv("HOME")
	if home == "" {
		home = os.Getenv("USERPROFILE")
	}
	var kubeconfig *string
	if home != "" {
		kubeconfig = flag.String("kubeconfig", filepath.Join(home, ".kube", "config"), "(optional) absolute path to the kubeconfig file")
	} else {
		kubeconfig = flag.String("kubeconfig", "", "absolute path to the kubeconfig file")
	}
	flag.Parse()

	config, err := clientcmd.BuildConfigFromFlags("", *kubeconfig)
	if err != nil {
		panic(err.Error())
	}

	kubeClient, err := kubernetes.NewForConfig(config)
	if err != nil {
		panic(err.Error())
	}
	return kubeClient
}

func getPodsAllNamespaces(kubeClient *kubernetes.Clientset) *corev1.PodList {
	pods, err := kubeClient.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		panic(err.Error())
	}
	return pods
}

func getNetworkPoliciesAllNamespaces(kubeClient *kubernetes.Clientset) *networkingv1.NetworkPolicyList {
	policies, err := kubeClient.NetworkingV1().NetworkPolicies("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		panic(err.Error())
	}
	return policies
}

func getNamespaces(kubeClient *kubernetes.Clientset) *corev1.NamespaceList {
	namespaces, err := kubeClient.CoreV1().Namespaces().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		panic(err.Error())
	}
	return namespaces
}

func computePodIsolations(pods *corev1.PodList, policies *networkingv1.NetworkPolicyList) []PodIsolation {
	podIsolations := make([]PodIsolation, 0)
	for _, pod := range pods.Items {
		podIsolation := computePodIsolation(&pod, policies)
		podIsolations = append(podIsolations, *podIsolation)
	}
	return podIsolations
}

func computePodIsolation(pod *corev1.Pod, policies *networkingv1.NetworkPolicyList) *PodIsolation {
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

func computeAllowedCommunications(podIsolations []PodIsolation, namespaces []corev1.Namespace) []AllowedCommunication {
	allowedCommunications := make([]AllowedCommunication, 0)
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

func computeAllowedCommunication(sourcePodIsolation *PodIsolation, targetPodIsolation *PodIsolation, namespaces []corev1.Namespace) *AllowedCommunication {
	sourceAllowsEgress := !sourcePodIsolation.isEgressIsolated() ||
		anyPolicyAllowsEgress(&targetPodIsolation.Pod, sourcePodIsolation, namespaces)
	targetAllowsIngress := !targetPodIsolation.isIngressIsolated() ||
		anyPolicyAllowsIngress(&sourcePodIsolation.Pod, targetPodIsolation, namespaces)
	if sourceAllowsEgress && targetAllowsIngress {
		return &AllowedCommunication{
			From:            sourcePodIsolation.Pod,
			EgressPolicies:  nil,
			To:              targetPodIsolation.Pod,
			IngressPolicies: nil,
		}
	} else {
		return nil
	}
}

func anyPolicyAllowsIngress(sourcePod *corev1.Pod, targetPodIsolation *PodIsolation, namespaces []corev1.Namespace) bool {
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

func anyPolicyAllowsEgress(targetPod *corev1.Pod, sourcePodIsolation *PodIsolation, namespaces []corev1.Namespace) bool {
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
