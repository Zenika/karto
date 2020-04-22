package main

import (
	"context"
	"flag"
	"fmt"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	"k8s.io/client-go/tools/clientcmd"
	"network-policy-explorer/trafficanalyzer"
	"os"
	"path/filepath"
)

func main() {
	kubeClient := initialize()
	pods := getPodsAllNamespaces(kubeClient)
	policies := getNetworkPoliciesAllNamespaces(kubeClient)
	namespaces := getNamespaces(kubeClient)
	allowedCommunications := trafficanalyzer.Analyze(pods, policies, namespaces)
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
