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

func main() {
	kubeClient := initialize()

	pods := getPodsAllNamespaces(kubeClient)
	for _, pod := range pods.Items {
		fmt.Printf("Pod: %v:\n", pod.Name)
		//fmt.Printf("    Namespace: %v\n", pod.Namespace)
		//fmt.Printf("    Labels:\n")
		//for key, value := range pod.Labels { // TODO Annotations
		//	fmt.Printf("        %v: %v\n", key, value)
		//}
		//fmt.Printf("    IP: %v\n", pod.Status.PodIP)
	}

	policies := getNetworkPoliciesAllNamespaces(kubeClient)
	for _, policy := range policies.Items {
		fmt.Printf("Network Policy: %v:\n", policy.Name)
		//fmt.Printf("    Namespace: %v\n", policy.Namespace)
		//fmt.Printf("    Labels:\n")
		//for key, value := range policy.Labels {
		//	fmt.Printf("        %v: %v\n", key, value)
		//}
		//fmt.Printf("    Pod Selector:\n")
		//for key, value := range policy.Spec.PodSelector.MatchLabels { //
		//	fmt.Printf("        %v: %v\n", key, value)
		//}
		//fmt.Printf("    Policy Type:\n")
		//for _, policyType := range policy.Spec.PolicyTypes {
		//	fmt.Printf("        %v\n", policyType)
		//}
	}

	podIsolations := computePodIsolation(pods, policies)
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

func computePodIsolation(pods *corev1.PodList, policies *networkingv1.NetworkPolicyList) []PodIsolation {
	podIsolations := make([]PodIsolation, 0)

	for _, pod := range pods.Items {
		podIsolation := NewPodIsolation(pod)
		for _, policy := range policies.Items {
			namespaceMatches := namespaceMatches(&pod, &policy)
			selectorMatches := selectorMatches(&pod, &policy)
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
		podIsolations = append(podIsolations, *podIsolation)
	}
	return podIsolations
}

func namespaceMatches(pod *corev1.Pod, policy *networkingv1.NetworkPolicy) bool {
	return pod.Namespace == policy.Namespace
}

func selectorMatches(pod *corev1.Pod, policy *networkingv1.NetworkPolicy) bool {
	podSelector := policy.Spec.PodSelector
	selector, err := metav1.LabelSelectorAsSelector(&podSelector)
	if err != nil {
		fmt.Printf("Could not parse PodSelector of NetworkPolicy %v\n", policy)
		return false
	}
	return selector.Matches(labels.Set(pod.Labels))
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
