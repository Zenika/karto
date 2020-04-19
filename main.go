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

	networkPolicies := getNetworkPoliciesAllNamespaces(kubeClient)
	for _, networkPolicy := range networkPolicies.Items {
		fmt.Printf("Network Policy: %v:\n", networkPolicy.Name)
		//fmt.Printf("    Namespace: %v\n", networkPolicy.Namespace)
		//fmt.Printf("    Labels:\n")
		//for key, value := range networkPolicy.Labels {
		//	fmt.Printf("        %v: %v\n", key, value)
		//}
		//fmt.Printf("    Pod Selector:\n")
		//for key, value := range networkPolicy.Spec.PodSelector.MatchLabels { //
		//	fmt.Printf("        %v: %v\n", key, value)
		//}
		//fmt.Printf("    Policy Type:\n")
		//for _, policyType := range networkPolicy.Spec.PolicyTypes {
		//	fmt.Printf("        %v\n", policyType)
		//}
	}

	isolatedPods, _ := computePodIsolation(pods, networkPolicies)
	for _, pod := range isolatedPods {
		fmt.Printf("Isolated Pod: %v:\n", pod.Name)
		//fmt.Printf("    Namespace: %v\n", pod.Namespace)
		//fmt.Printf("    Labels:\n")
		//for key, value := range pod.Labels { // TODO Annotations
		//	fmt.Printf("        %v: %v\n", key, value)
		//}
		//fmt.Printf("    IP: %v\n", pod.Status.PodIP)
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
	networkPolicies, err := kubeClient.NetworkingV1().NetworkPolicies("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		panic(err.Error())
	}
	return networkPolicies
}

func computePodIsolation(pods *corev1.PodList, networkPolicies *networkingv1.NetworkPolicyList) ([]corev1.Pod, []corev1.Pod) {
	isolatedPods := make([]corev1.Pod, 0)
	nonIsolatedPods := make([]corev1.Pod, 0)

	for _, pod := range pods.Items {
		if isPodIsolated(pod, networkPolicies) {
			isolatedPods = append(isolatedPods, pod)
		} else {
			nonIsolatedPods = append(nonIsolatedPods, pod)
		}
	}

	return isolatedPods, nonIsolatedPods
}

func isPodIsolated(pod corev1.Pod, networkPolicies *networkingv1.NetworkPolicyList) bool {
	for _, networkPolicy := range networkPolicies.Items {
		podSelector := networkPolicy.Spec.PodSelector
		selector, err := metav1.LabelSelectorAsSelector(&podSelector)
		if err != nil {
			fmt.Printf("Could not parse PodSelector of NetworkPolicy %v\n", networkPolicy)
			continue
		}
		namespaceMatches := pod.Namespace == networkPolicy.Namespace
		selectorMatches := selector.Matches(labels.Set(pod.Labels))
		if namespaceMatches && selectorMatches {
			return true
		}
	}
	return false
}
